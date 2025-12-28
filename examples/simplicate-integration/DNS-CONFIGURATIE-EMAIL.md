# DNS Configuratie voor E-mail (scex.nl)

## E-mail naar Hostingpartij

**Onderwerp: DNS-records toevoegen voor e-mailservice (scex.nl)**

Beste,

Ik wil graag e-mail kunnen versturen via onze domeinnaam scex.nl met behulp van de e-mailservice Resend. Hiervoor moeten er 3 DNS-records toegevoegd worden aan het domein scex.nl.

**Kunnen jullie de volgende DNS-records toevoegen?**

---

### Record 1: DKIM (voor e-mail authenticatie)

- **Type**: TXT
- **Naam/Host**: `resend._domainkey`
- **Waarde**: `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCq400a39QX7IQJHL0a7kdojG3gxTJJUApe77WwGi6hJNQ/0bhKk6UROPCVNrIIoOVTInA5geqctSjp/Bly4Kk1jJuWgFMGgnx+jN27Aql2jpSZU2zCE5Z0vGr5LPTaa5FRrsNUGEk+wH0aK2EYWAU5BLlwMt6Ac3KBxzM/4/nYGQIDAQAB`
- **TTL**: Auto (of standaardwaarde)

---

### Record 2: SPF (voor afzender verificatie)

- **Type**: TXT
- **Naam/Host**: `send`
- **Waarde**: `v=spf1 include:amazonses.com ~all`
- **TTL**: Auto (of standaardwaarde)

---

### Record 3: MX (voor SPF routing)

- **Type**: MX
- **Naam/Host**: `send`
- **Waarde/Doel**: `feedback-smtp.us-east-1.amazonses.com`
- **Prioriteit**: 10
- **TTL**: Auto (of standaardwaarde)

---

**Opmerking**: Deze records zijn alleen voor _uitgaande_ e-mail via onze applicatie. Ze hebben geen invloed op bestaande e-mail die via scex.nl loopt.

Kunnen jullie bevestigen wanneer dit is ingesteld? Dan kan ik testen of het werkt.

Alvast bedankt!

Met vriendelijke groet,
Willem van den Berg

---

## Na DNS Configuratie

Wanneer de hostingpartij heeft bevestigd dat de DNS-records zijn toegevoegd:

1. **Wacht 30-60 minuten** voor DNS propagatie
2. **Controleer verificatie** op https://resend.com/domains (klik op scex.nl)
3. **Update EMAIL_FROM** in Vercel naar `noreply@scex.nl` of `automation@scex.nl`
4. **Test e-mail** versturen naar willem@scex.nl

### Vercel Environment Variable Updaten

```bash
# Via Vercel CLI
vercel env rm EMAIL_FROM production
vercel env add EMAIL_FROM production
# Voer in: noreply@scex.nl

# Of via Vercel Dashboard
https://vercel.com/willemvandenberg/simplicate-automations/settings/environment-variables
```

### Test E-mail Versturen

```bash
curl -s -X POST "https://simplicate-automations.vercel.app/api/trpc/hoursReport.sendReport" \
  -H "Content-Type: application/json" \
  -d '{"json":{"employeeId":"cmiigv6fp000cjp045dym3457","month":"2025-10"}}'
```

Check inbox willem@scex.nl voor uren rapportage Oktober 2025.
