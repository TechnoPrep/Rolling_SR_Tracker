// Set this Variable based on your Sheet URL
var spreadSheetAURL = "https://docs.google.com/spreadsheets/d/1klN8yDL4q9ldKrVtoUbOhSi2JdF-Q2C0WjEN-DKtdJ4/edit";
// How many weeks you want to track rolling SR
var weeksForRollingSr = 10

// Get all Sheets from your Document
function getSheetRange() {
  
  var sheetNameArray = [];
  var spreadSheetsInA = SpreadsheetApp.openByUrl(spreadSheetAURL).getSheets();

  // Iterate through each sheet, remove the Master Sheet where everything is stored
  for (var i = 0; i < spreadSheetsInA.length; i++) {
    sheetName = spreadSheetsInA[i].getName()
    if (sheetName == 'Master Sheet') {
      continue;
    }

    // Break from loop, only want 10 Weeks worth of SR's
    if (i > weeksForRollingSr){
      break;
    }

    // Push sheets names to array 
    sheetNameArray.push(sheetName) 
      
  }

  return sheetNameArray

}

// Create a Hashmap of Each Raider from this week with their Items they have SR'd
function createHashLootCurrentWeek() {
  var currentWeeksLootSheet = getSheetRange()[0];
  var currentLootMap = {};
  var sheet = SpreadsheetApp.openByUrl(spreadSheetAURL).getSheetByName(currentWeeksLootSheet);
  var data = sheet.getDataRange().getValues();

  // Iterate through each line of data in the Previous Weeks Sheet
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var raider = row[3];
    var itemId = row[1];
    var itemName = row[0];

    // Check if an object already exists for the raider, if not create an empty object
    if (!currentLootMap[raider]) {
      currentLootMap[raider] = {};
    }

    // Check if the raider already has this item associated to them
    if (!currentLootMap[raider][itemId]) {
      //Add an object with they key of the item containing the items name, a base itemSrCount and missedItemPreviousWeek as false
      currentLootMap[raider][itemId] = {
        'itemName': itemName,
        'missedItemPreviousWeek': false,
        'itemSrCount': 1
      };
    }
  }
  return currentLootMap;
}

// Create a Hashmap of Each Raider from the week passed through and their Items they have SR'd
function createHashLootPreviousWeeks(sheetName) {
  var sheet = SpreadsheetApp.openByUrl(spreadSheetAURL).getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var thisWeeksLootMap = {};

  // Iterate through each line of data in the Previous Weeks Sheet
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var raider = row[3];
    var itemId = row[1];

    // Create an empty object for each raider for this sheet
    if (!thisWeeksLootMap[raider]) {
      thisWeeksLootMap[raider] = {};
    }

    // If the the itemId object doesn exist for that raider, create it with a bullshit value just to exist
    if (!thisWeeksLootMap[raider][itemId]) {
      thisWeeksLootMap[raider][itemId] = {
        iZugZug: false
      };
    }
  }

  return thisWeeksLootMap;
}

// Compare Each Previous Week SR sheet to the Current SR Sheet
function compareCurrentAndPreviousWeeksLoot() {
  var sheetArray = getSheetRange();
  var currentWeeksRaiderLoot = createHashLootCurrentWeek();

  // Iterate through each Sheet
  for (var i = 1; i < sheetArray.length; i++) {
    var sheetName = sheetArray[i];
    var sheetLoot = createHashLootPreviousWeeks(sheetName);

    // Iterate through Each Raider
    for (var raiderName in currentWeeksRaiderLoot) {
      // Find the raiderName Obj from the Previous Raid weeks Sheet
      var previousWeekRaiderObj = sheetLoot[raiderName];

      // Raider doesn't exist for the items they SR'd this current week in previous weeks, mark missedItemPreviousWeek to true 
      if (!previousWeekRaiderObj) {
        for (var itemId in currentWeeksRaiderLoot[raiderName]){
          currentWeeksRaiderLoot[raiderName][itemId].missedItemPreviousWeek = true;
        }
        continue;
      }

      // Iterate through each item object on the currentWeeksRaiderLoot
      for (var itemId in currentWeeksRaiderLoot[raiderName]) {
        // If the itemId exists in the previous weerks Raider Object
        if (itemId in previousWeekRaiderObj) {
          // And the current weeks item missedItemPreviousWeek is false
          if(!currentWeeksRaiderLoot[raiderName][itemId].missedItemPreviousWeek){
            // Add 1 to their SR Bonus
            currentWeeksRaiderLoot[raiderName][itemId].itemSrCount += 1;
          }
        } else {
          // If the itemId doesnt exist in the previous weeks list, mark missedItemPreviousWeek to true
          currentWeeksRaiderLoot[raiderName][itemId].missedItemPreviousWeek = true;
        }
      }
    }
  }

  return currentWeeksRaiderLoot;
}

// Write each Raider, their SR'd item and what their SR Bonus is to a line 
function writecurrentWeeksRaiderLootToSheet(){
  var raiderLootToAppend = compareCurrentAndPreviousWeeksLoot()
  var masterSheet = SpreadsheetApp.openByUrl(spreadSheetAURL).getSheetByName('Master Sheet');

  // Clear all rows before appending Data
  masterSheet.clear()

  // Append Header Rows
  masterSheet.appendRow(['Raider Name', 'Item Name', 'Rolling SR Bonus'])

  // Iterate through each raider object
  for (var raiderName in raiderLootToAppend){
    var raiderObj = raiderLootToAppend[raiderName]

    items = Object.keys(raiderObj)

    items.forEach(item => {
      var itemName = raiderObj[item].itemName
      var itemSrCount = raiderObj[item].itemSrCount == 0 || raiderObj[item].itemSrCount == 1 ? "No Rolling SR Bonus" : raiderObj[item].itemSrCount * 10
      masterSheet.appendRow([raiderName, itemName, itemSrCount])
    });
    
  }
}

writecurrentWeeksRaiderLootToSheet()