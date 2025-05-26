
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthCodeRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: AuthCodeRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "AkProject <noreply@resend.dev>",
      to: [email],
      subject: "Код авторизации AkProject",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
            .logo { color: white; font-size: 32px; font-weight: bold; margin: 0; }
            .subtitle { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px; }
            .content { padding: 40px 30px; text-align: center; }
            .code-container { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 30px; margin: 30px 0; }
            .code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace; }
            .code-label { color: #666; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
            .message { color: #333; font-size: 16px; line-height: 1.6; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">🚀 AkProject</h1>
              <p class="subtitle">AI Assistant Platform</p>
            </div>
            
            <div class="content">
              <h2 style="color: #333; margin-top: 0;">Добро пожаловать!</h2>
              <p class="message">
                Мы получили запрос на вход в ваш аккаунт AkProject. 
                Используйте код ниже для завершения авторизации:
              </p>
              
              <div class="code-container">
                <div class="code-label">Код авторизации</div>
                <div class="code">${code}</div>
              </div>
              
              <div class="warning">
                ⚠️ Этот код действителен в течение 10 минут. Никому не сообщайте его!
              </div>
              
              <p class="message">
                Если вы не запрашивали этот код, просто проигнорируйте это письмо.
              </p>
            </div>
            
            <div class="footer">
              <p>© 2024 AkProject. Все права защищены.</p>
              <p>Это автоматическое сообщение, не отвечайте на него.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Auth code email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending auth code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
