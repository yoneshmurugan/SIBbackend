export const getWelcomeEmailTemplate = (email, password) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to SIB Portal</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #111827;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 32px 40px; border-bottom: 1px solid #f3f4f6; text-align: center;">
                            <img src="https://www.senguntharinbusiness.in/assets/logo.webp" alt="SIB Logo" style="height: 60px; width: auto; max-width: 100%; display: block; margin: 0 auto;">
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 700; color: #111827; text-align: center;">Welcome to the SIB Portal!</h1>
                            
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                                Your account has been successfully created. You can now log in to the portal and explore our exclusive business network.
                            </p>

                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                                <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</h3>
                                <p style="margin: 0 0 12px; font-size: 16px; color: #1e293b;">
                                    <strong>Username:</strong> <span style="color: #059669;">${email}</span>
                                </p>
                                <p style="margin: 0; font-size: 16px; color: #1e293b;">
                                    <strong>Password:</strong> <span style="color: #059669;">${password}</span>
                                </p>
                            </div>

                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 32px;">
                                <tr>
                                    <td align="center">
                                        <a href="https://www.senguntharinbusiness.in" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Login to Portal</a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px;">
                                <h4 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #92400e;">Security Notice</h4>
                                <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: #92400e;">
                                    For your security, please change your password immediately after your first login.
                                </p>
                                <ol style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #92400e;">
                                    <li>Go to <strong>Dashboard</strong></li>
                                    <li>Click <strong>Profile</strong> &gt; <strong>Settings</strong></li>
                                    <li>Select the <strong>Security</strong> tab</li>
                                    <li>Click <strong>Change Password</strong></li>
                                </ol>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #f3f4f6; text-align: center;">
                            <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                                Need help? Contact us at <a href="mailto:sibconnect2025@gmail.com" style="color: #059669; text-decoration: none;">sibconnect2025@gmail.com</a>
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                &copy; ${new Date().getFullYear()} Sengundhar in Business. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

export const getPasswordResetTemplate = (resetLink) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #111827;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 32px 40px; border-bottom: 1px solid #f3f4f6; text-align: center;">
                            <img src="https://www.senguntharinbusiness.in/assets/logo.webp" alt="SIB Logo" style="height: 60px; width: auto; max-width: 100%; display: block; margin: 0 auto;">
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 700; color: #111827; text-align: center;">Reset Your Password</h1>
                            
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                                We received a request to reset your password for your SIB Portal account. You can securely reset it by clicking the button below.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 32px; margin-top: 16px;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetLink}" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Reset My Password</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #6b7280; text-align: center;">
                                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #f3f4f6; text-align: center;">
                            <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                                Need help? Contact us at <a href="mailto:sibconnect2025@gmail.com" style="color: #059669; text-decoration: none;">sibconnect2025@gmail.com</a>
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                &copy; ${new Date().getFullYear()} Sengundhar in Business. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
