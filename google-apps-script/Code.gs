/**
 * AirDrive transactional email relay.
 * Add AIRDRIVE_EMAIL_SECRET in Project Settings > Script properties,
 * then deploy this project as a web app executed as yourself.
 */
function doPost(e) {
  try {
    var payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('AIRDRIVE_EMAIL_SECRET');

    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }
    if (!payload.to || !payload.subject || !payload.html) {
      return jsonResponse({ ok: false, error: 'Missing email fields' });
    }
    if (String(payload.subject).length > 200 || String(payload.html).length > 100000) {
      return jsonResponse({ ok: false, error: 'Email content is too large' });
    }

    MailApp.sendEmail({
      to: String(payload.to),
      subject: String(payload.subject),
      htmlBody: String(payload.html),
      name: String(payload.fromName || 'AirDrive'),
      noReply: true
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('AirDrive email relay failed: ' + error.message);
    return jsonResponse({ ok: false, error: error.message || 'Email delivery failed' });
  }
}

function jsonResponse(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
