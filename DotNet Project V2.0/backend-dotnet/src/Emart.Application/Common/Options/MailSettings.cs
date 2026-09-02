namespace Emart.Application.Common.Options;

public class MailSettings
{
    public const string SectionName = "Mail";

    public string Host { get; set; } = "smtp.gmail.com";

    public int Port { get; set; } = 587;

    public string Username { get; set; } = "";

    public string Password { get; set; } = "";

    /// <summary>Falls back to Username if blank, matching the Java EmailServiceImpl behaviour.</summary>
    public string From { get; set; } = "";
}
