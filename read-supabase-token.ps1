Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredentialReader {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public uint Flags;
        public uint Type;
        public IntPtr TargetName;
        public IntPtr Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public IntPtr TargetAlias;
        public IntPtr UserName;
    }

    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, uint type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern bool CredFree(IntPtr cred);

    public static string GetPassword(string target) {
        IntPtr credPtr;
        if (CredRead(target, 1, 0, out credPtr)) {
            CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            byte[] bytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, bytes, 0, (int)cred.CredentialBlobSize);
            CredFree(credPtr);
            // Try UTF-8 first (Supabase CLI stores as UTF-8)
            string utf8result = Encoding.UTF8.GetString(bytes).TrimEnd('\0').Trim();
            if (utf8result.Length > 10) return utf8result;
            // Fallback to Unicode
            return Encoding.Unicode.GetString(bytes).TrimEnd('\0').Trim();
        }
        return null;
    }
}
"@

$token = [CredentialReader]::GetPassword("Supabase CLI:supabase")
if ($token -and $token.Length -gt 10) {
    Write-Output $token
} else {
    Write-Error "Token not found or invalid"
    exit 1
}
