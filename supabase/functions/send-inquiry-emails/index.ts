type Inquiry = {
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  project_type: string | null;
  message: string;
  created_at: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendEmail(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Resend rejected an inquiry email with status ${response.status}.`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Could not connect to the email provider:",
      error instanceof Error ? error.message : "unknown network error",
    );
    return false;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return respond(405, { error: "Method not allowed." });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond(400, { error: "A valid JSON request is required." });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("submission_token" in body) ||
    typeof body.submission_token !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.submission_token,
    )
  ) {
    return respond(400, { error: "A valid inquiry token is required." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM");
  const inquiryTo = Deno.env.get("INQUIRY_TO_EMAIL") || "fusionversestudios.ai@gmail.com";

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !emailFrom) {
    console.error("Inquiry email secrets are not fully configured.");
    return respond(500, { error: "Inquiry email notifications are not configured." });
  }

  let inquiryResponse: Response;
  try {
    const url = new URL("/rest/v1/inquiries", supabaseUrl);
    url.searchParams.set("submission_token", `eq.${body.submission_token}`);
    url.searchParams.set(
      "select",
      "name,email,phone,company,project_type,message,created_at",
    );
    url.searchParams.set("limit", "1");
    inquiryResponse = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
  } catch (error) {
    console.error(
      "Could not look up the submitted inquiry:",
      error instanceof Error ? error.message : "unknown network error",
    );
    return respond(502, { error: "Could not retrieve the submitted inquiry." });
  }

  if (!inquiryResponse.ok) {
    console.error(`Inquiry lookup failed with status ${inquiryResponse.status}.`);
    return respond(502, { error: "Could not retrieve the submitted inquiry." });
  }

  let inquiries: Inquiry[];
  try {
    inquiries = await inquiryResponse.json();
  } catch {
    return respond(502, { error: "Could not read the submitted inquiry." });
  }

  const inquiry = inquiries[0];
  if (!inquiry) {
    return respond(404, { error: "The submitted inquiry was not found." });
  }

  const adminText = [
    "A new inquiry was submitted through the Fusion Verse Studios website.",
    "",
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    `Mobile number: ${inquiry.phone || "Not provided"}`,
    `Company / Brand: ${inquiry.company || "Not provided"}`,
    `Project type: ${inquiry.project_type || "Not provided"}`,
    `Submitted: ${inquiry.created_at}`,
    "",
    "Project description:",
    inquiry.message,
  ].join("\n");

  const confirmationText = [
    `Hi ${inquiry.name},`,
    "",
    "Thanks for submitting your inquiry to Fusion Verse Studios. We received your message and will get back to you soon.",
    "",
    "Fusion Verse Studios",
  ].join("\n");

  const [adminEmailSent, confirmationEmailSent] = await Promise.all([
    sendEmail(resendApiKey, {
      from: emailFrom,
      to: [inquiryTo],
      reply_to: inquiry.email,
      subject: `New project inquiry from ${inquiry.name}`,
      text: adminText,
    }),
    sendEmail(resendApiKey, {
      from: emailFrom,
      to: [inquiry.email],
      subject: "Thanks for your inquiry | Fusion Verse Studios",
      text: confirmationText,
    }),
  ]);

  if (!adminEmailSent || !confirmationEmailSent) {
    return respond(502, {
      error: "The inquiry was saved, but one or more emails could not be sent.",
      admin_email_sent: adminEmailSent,
      confirmation_email_sent: confirmationEmailSent,
    });
  }

  return respond(200, {
    admin_email_sent: true,
    confirmation_email_sent: true,
  });
});
