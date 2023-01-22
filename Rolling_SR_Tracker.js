/**
 * Version 1.0 2023/01/12
 *  - Initial Creation
 * 
 * Version 2.0 2023/01/21
 *  - Updated logic to only subtract 10 from a raiders Rolling SR if they miss a week
 *    rather that wiping their Soft Reserves.
 * 
 * Version 3.0 2023/01/22
 *  - Updated writing to the Master Sheet to sort Raiders by name.
*/

// Set this Variable based on your Sheet URL
var spreadSheetAURL = "https://docs.google.com/spreadsheets/d/1klN8yDL4q9ldKrVtoUbOhSi2JdF-Q2C0WjEN-DKtdJ4/edit";
// How many weeks you want to track rolling SR
var weeksForRollingSr = 10
var weeksChecked = 0

/**
 * Returns an array of sheet names from a specific spreadsheet, filtered by a certain number of weeks.
 * @param {number} weeksForRollingSr - The number of weeks to filter the sheet names by.
 * @param {string} spreadSheetAURL - The URL of the specific spreadsheet from which the sheet names are retrieved.
 * @returns {array} An array of sheet names.
 */
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

/**
 * Returns a hash map of current week's loot, grouping items by raider's name and item Id.
 * @param {string} spreadSheetAURL - The URL of the specific spreadsheet from which the sheet names are retrieved.
 * @returns {object} An object that contains a hash map of current week's loot, grouped by raider and item Id.
 */
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

/**
 * Returns a hash map of previous week's loot, grouping items by raider's name and item Id.
 * @param {string} sheetName - The name of the sheet that contains the data of previous week's loot.
 * @param {string} spreadSheetAURL - The URL of the specific spreadsheet from which the sheet names are retrieved.
 * @returns {object} An object that contains a hash map of previous week's loot, grouped by raider and item Id.
 */
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

/**
 * Check if the raider was present in the loot sheet two weeks prior to the current week being checked.
 * If the raider was present, it will return the itemSrCount -1 for each week missed.
 * @param {object} currentWeeksRaider - The current week's raider loot map.
 * @param {string} raiderName - The name of the raider being checked.
 * @param {array} sheetArray - An array of sheet names that contains the data of previous weeks' loot.
 * @param {number} itemId - The ID of the item being checked.
 * @param {number} index - The current index of the sheetArray that is being checked.
 * @param {number} loopCount - The number of weeks missed by the raider.
 * @returns {number} The itemSrCount for the current week's raider and itemId.
 */
function checkTwoWeeksPriorLoot(currentWeeksRaider, raiderName, sheetArray, itemId ,index, loopCount){

  var nextIndex = index + 1
  var isLastSheet = nextIndex == sheetArray.length ? true : false

  //Check if this is the last sheet in the sheetArray
  if(!isLastSheet){
    var previousWeekSheetName = sheetArray[nextIndex]
    var previousWeekSheetLoot = createHashLootPreviousWeeks(previousWeekSheetName);
    var twoWeeksPriorRaider = previousWeekSheetLoot[raiderName]

    // Check if raider exists an additional week back
    if(twoWeeksPriorRaider){
      // Check if the itemId exists in that raider from the additional week back
      if(itemId in twoWeeksPriorRaider){
        // Subtract loopCount from currentWeeksRaider[itemId].itemSrCount if they will not push it below 1, if they do, return 
        return (loopCount - currentWeeksRaider[itemId].itemSrCount) < 1 ? currentWeeksRaider[itemId].itemSrCount -= loopCount : 1;
      }
      // Return the itemSrCount - This is due to the raider existing, but they SR'd a different item after they came back
      // Do not want to pentalize them for new SR's since their absence, since when they SR a new item, it wipes the SR count.
      return currentWeeksRaider[itemId].itemSrCount
    } else {
      // If the raider doesn't exist keep checking previous weeks, until they are found or we run out of sheets.
      loopCount++
      checkTwoWeeksPriorLoot(currentWeeksRaider, raiderName, sheetArray, itemId, nextIndex, loopCount)
    } 
  } 

  // If it is the last sheet, just return the current currentWeeksRaider[itemId].itemSrCount
  return currentWeeksRaider[itemId].itemSrCount

}

/**
 * Compare the current week's loot sheet with the previous weeks' loot sheets, and return a hash map of current week's 
 * loot with updated itemSrCount and missedItemPreviousWeek properties.
 * @returns {object} An object that contains a hash map of current week's loot,
 * grouped by raider and item Id, with updated itemSrCount and missedItemPreviousWeek properties.
 */
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

      // If the raiders doesn't exist at all in the previous week
      if (!previousWeekRaiderObj) {
        // If they dont exist, mark them as missing a week
        for (var itemId in currentWeeksRaiderLoot[raiderName]){
          // If a raider misses 1 week
          // If the item they have SR'd has been sr'd by them for more than 1 week in a row
          currentWeeksRaiderLoot[raiderName][itemId].itemSrCount = checkTwoWeeksPriorLoot(currentWeeksRaiderLoot[raiderName], raiderName, sheetArray, itemId, i, 1)
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

/**
 * Writes the current week's raider loot information to the 'Master Sheet' by sorting the raider's loot by alphabetical order, 
 * appending the header rows, and then appending the raider and item information along with the calculated rolling SR bonus.
 * @returns {void}
 */
function writecurrentWeeksRaiderLootToSheet(){
  var raiderLootToAppend = compareCurrentAndPreviousWeeksLoot();
  var masterSheet = SpreadsheetApp.openByUrl(spreadSheetAURL).getSheetByName('Master Sheet');

  var sortedLootMap = Object.fromEntries(Object.entries(raiderLootToAppend).sort((a, b) => a[0].localeCompare(b[0])));

  // Clear all rows before appending Data
  masterSheet.clear();

  // Append Header Rows
  masterSheet.appendRow(['Raider Name', 'Item Name', 'Rolling SR Bonus']);

  // Iterate through each raider object
  for (var raiderName in sortedLootMap){
    var raiderObj = sortedLootMap[raiderName];

    items = Object.keys(raiderObj)
    Logger.log(items)
    items.forEach(item => {
      var itemName = raiderObj[item].itemName;
      var itemSrCount = raiderObj[item].itemSrCount == 0 || raiderObj[item].itemSrCount == 1 ? "No Rolling SR Bonus" : raiderObj[item].itemSrCount * 10;
      masterSheet.appendRow([raiderName, itemName, itemSrCount]);
    })
    
  }
}

writecurrentWeeksRaiderLootToSheet()