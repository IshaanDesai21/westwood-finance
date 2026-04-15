function doGet(e) {
  var action = e.parameter.action;
  
  if (action === 'deleteOrder') {
    return deleteOrder(e);
  }
  
  // ... your other actions stay the same ...
  // if (action === 'addOrder') { ... }
}

function deleteOrder(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
    var rowIndex = parseInt(e.parameter.rowIndex);
    
    // Check if key matches (if your script expects a key)
    // if (e.parameter.key !== 'YOUR_SECRET_KEY') return ContentService.createTextOutput(JSON.stringify({error: "Unauthorized"}))...
    
    // IMPORTANT FIX: Use complete deleteRow rather than clearContent
    // This physically shifts all rows up and removes the gap
    sheet.deleteRow(rowIndex);
    
    var result = {
      status: "success",
      message: "Order completely removed"
    };
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
