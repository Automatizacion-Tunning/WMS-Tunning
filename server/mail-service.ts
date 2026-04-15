import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';

// Configuración de Microsoft Graph API para Office 365
const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const senderEmail = process.env.SMTP_USER;

let graphClient: Client | null = null;

function getGraphClient(): Client | null {
  if (!tenantId || !clientId || !clientSecret) {
    console.error('Error: Variables de Azure no configuradas (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)');
    return null;
  }

  if (!graphClient) {
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });
    graphClient = Client.initWithMiddleware({ authProvider });
  }

  return graphClient;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
}

// Modo pruebas: descomentar para redirigir todos los correos
// const TEST_MODE_REDIRECT_EMAIL = 'felipe.soto@tunning.cl';
const TEST_MODE_REDIRECT_EMAIL = '';

function toRecipients(emails: string | string[]): Array<{ emailAddress: { address: string } }> {
  const emailArray = Array.isArray(emails) ? emails : [emails];
  if (TEST_MODE_REDIRECT_EMAIL) {
    console.log(`[MAIL-TEST-MODE] Redirigiendo correo de [${emailArray.join(', ')}] a ${TEST_MODE_REDIRECT_EMAIL}`);
    return [{ emailAddress: { address: TEST_MODE_REDIRECT_EMAIL } }];
  }
  return emailArray.map(email => ({ emailAddress: { address: email } }));
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const client = getGraphClient();
  if (!client) {
    return { success: false, error: 'Microsoft Graph no configurado.' };
  }

  const sender = options.from || senderEmail;
  if (!sender) {
    return { success: false, error: 'No se especificó email del remitente. Configure SMTP_USER.' };
  }

  try {
    const message: any = {
      subject: options.subject,
      body: {
        contentType: options.html ? 'HTML' : 'Text',
        content: options.html || options.text || '',
      },
      toRecipients: toRecipients(options.to),
    };

    if (options.cc) message.ccRecipients = toRecipients(options.cc);
    if (options.bcc) message.bccRecipients = toRecipients(options.bcc);

    if (options.attachments && options.attachments.length > 0) {
      message.attachments = options.attachments.map(att => {
        let contentBytes = '';
        if (att.content) {
          contentBytes = Buffer.isBuffer(att.content)
            ? att.content.toString('base64')
            : Buffer.from(att.content).toString('base64');
        }
        return {
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.filename,
          contentType: att.contentType || 'application/octet-stream',
          contentBytes,
        };
      });
    }

    await client.api(`/users/${sender}/sendMail`).post({
      message,
      saveToSentItems: true,
    });

    console.log(`Email enviado exitosamente via Microsoft Graph desde ${sender}`);
    return { success: true, messageId: `graph-${Date.now()}` };
  } catch (error: any) {
    console.error('Error al enviar email:', error.message);
    return { success: false, error: error.message };
  }
}

export async function verifyEmailConnection(): Promise<boolean> {
  const client = getGraphClient();
  if (!client) return false;

  try {
    const sender = senderEmail;
    if (!sender) return false;
    await client.api(`/users/${sender}`).get();
    console.log('✅ Microsoft Graph: Conexión verificada');
    return true;
  } catch (error: any) {
    console.error('❌ Microsoft Graph: Error de conexión:', error.message);
    return false;
  }
}
