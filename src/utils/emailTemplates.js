/**
 * Templates d'emails HTML
 */

const verificationEmailTemplate = (name, otp) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF6B00; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 5px 5px; }
        .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            color: #FF6B00; 
            text-align: center; 
            padding: 20px; 
            background: white; 
            border-radius: 5px;
            letter-spacing: 5px;
        }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RUGORI GAZ</h1>
            <p>Vérification de votre compte</p>
        </div>
        <div class="content">
            <p>Bonjour ${name},</p>
            <p>Merci de vous être inscrit sur RUGORI GAZ. Pour finaliser votre inscription, veuillez utiliser le code de vérification ci-dessous :</p>
            
            <div class="otp-code">${otp}</div>
            
            <p>Ce code est valable pendant 24 heures.</p>
            <p>Si vous n'avez pas créé de compte sur RUGORI GAZ, veuillez ignorer cet email.</p>
            
            <p>Cordialement,<br>L'équipe RUGORI GAZ</p>
        </div>
        <div class="footer">
            <p>RUGORI GAZ - Votre partenaire gazier de confiance au Burundi</p>
            <p>Contact : +257 XX XX XX XX | contact@rugorigaz.bi</p>
        </div>
    </div>
</body>
</html>
`;

const passwordResetTemplate = (name, otp) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF6B00; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 5px 5px; }
        .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            color: #FF6B00; 
            text-align: center; 
            padding: 20px; 
            background: white; 
            border-radius: 5px;
            letter-spacing: 5px;
        }
        .warning { 
            background: #fff3cd; 
            border-left: 4px solid #ffc107; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 5px;
        }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RUGORI GAZ</h1>
            <p>Réinitialisation de mot de passe</p>
        </div>
        <div class="content">
            <p>Bonjour ${name},</p>
            <p>Nous avons reçu une demande de réinitialisation de votre mot de passe. Utilisez le code ci-dessous pour continuer :</p>
            
            <div class="otp-code">${otp}</div>
            
            <div class="warning">
                <strong>⚠️ Attention :</strong> Ce code est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email et contacter notre support.
            </div>
            
            <p>Cordialement,<br>L'équipe RUGORI GAZ</p>
        </div>
        <div class="footer">
            <p>RUGORI GAZ - Votre partenaire gazier de confiance au Burundi</p>
            <p>Contact : +257 XX XX XX XX | contact@rugorigaz.bi</p>
        </div>
    </div>
</body>
</html>
`;

module.exports = {
    verificationEmailTemplate,
    passwordResetTemplate
};