  const functions = require('firebase-functions');
  const nodemailer = require('nodemailer');
  const cors = require('cors')({ origin: true });

  // Configure email transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'Jayknightvigilla@gmail.com',
      pass: 'sfwq xuwy xgnr wgzu'
    }
  });

  exports.sendOTP = functions.https.onRequest((req, res) => {
    // Enable CORS
    return cors(req, res, async () => {
      try {
        // Handle OPTIONS request (preflight)
        if (req.method === 'OPTIONS') {
          res.set('Access-Control-Allow-Methods', 'POST');
          res.set('Access-Control-Allow-Headers', 'Content-Type');
          res.status(204).send('');
          return;
        }

        // Only allow POST requests
        if (req.method !== 'POST') {
          return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
          });
        }

        // Extract data from request
        const { to, otp } = req.body;

        // Validate required fields
        if (!to || !otp) {
          return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields: to and otp' 
          });
        }

        // Email content
        const mailOptions = {
          from: 'Florist & Cake Shop <Jayknightvigilla@gmail.com>',
          to: to,
          subject: '🔐 Your Login Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
              <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #8B5CF6; text-align: center; margin-bottom: 10px;">🌸 Florist & Cake Shop</h2>
                <h3 style="color: #333; text-align: center; margin-bottom: 20px;">Login Verification</h3>
                
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Hello! You requested to login to your account. Use the verification code below:
                </p>
                
                <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 25px; border-radius: 10px; text-align: center; margin: 30px 0;">
                  <p style="color: white; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
                  <h1 style="color: white; font-size: 48px; letter-spacing: 12px; margin: 10px 0; font-family: 'Courier New', monospace;">${otp}</h1>
                </div>
                
                <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="color: #92400E; margin: 0; font-size: 14px;">
                    <strong>⏰ Important:</strong> This code will expire in <strong>5 minutes</strong>.
                  </p>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                  🔒 For security reasons, never share this code with anyone.<br>
                  ❓ If you didn't request this code, please ignore this email.
                </p>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    © 2024 Florist & Cake Shop. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          `
        };

        // Send email
        await transporter.sendMail(mailOptions);
        
        console.log(`OTP sent successfully to ${to}`);
        
        return res.status(200).json({ 
          success: true, 
          message: 'OTP sent successfully' 
        });
        
      } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
  });