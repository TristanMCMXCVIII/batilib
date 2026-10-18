type SendEmailParams = {
    to: string;
    subject: string;
    html: string;
};

export async function sendEmail({
                                    to,
                                    subject,
                                    html,
                                }: SendEmailParams) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            accept: "application/json",
            "content-type": "application/json",
            "api-key": process.env.BREVO_API_KEY as string,
        },
        body: JSON.stringify({
            sender: {
                name: process.env.BREVO_SENDER_NAME,
                email: process.env.BREVO_SENDER_EMAIL,
            },
            to: [
                {
                    email: to,
                },
            ],
            subject,
            htmlContent: html,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Brevo error: ${error}`);
    }
}