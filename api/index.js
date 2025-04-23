export default async function handler(req, res) {
  const { token, email } = req.query;

  console.log("Bejövő token:", token);
  console.log("Bejövő email:", email);

  if (!token || !email) {
    return res.status(400).send('Hiányzó token vagy email');
  }

  try {
    const edgeConfig = createEdgeConfigClient(process.env.EDGE_CONFIG);
    const userData = await edgeConfig.get(token);

    console.log("Edge Config válasz:", userData);

    if (!userData || userData.email !== email) {
      return res.status(403).send('Érvénytelen belépési adatok');
    }

    res.setHeader('Set-Cookie', [
      `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
      `auth_email=${email}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`
    ]);

    return res.redirect(307, '/app/');
  } catch (error) {
    console.error('Edge Config error:', error);
    return res.status(500).send('Szerver hiba történt');
  }
}
