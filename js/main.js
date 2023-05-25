// Prepare variables.


let cropList;

var svgWidth = 1080;
var svgHeight = 480;

var width = svgWidth - 48;
var height = (svgHeight - 56) / 2;
var barPadding = 4;
var barWidth = width / seasons[options.season].crops.length - barPadding;
var miniBar = 8;
var barOffsetX = 56;
var barOffsetY = 40;
var jaMods = [];
var stfMods = [];
var index1 = -1;


var templateMaker = function (obj) {
    return function (context) {
        var replacer = function (key, val) {
            if (typeof val === 'function') {
                return context[val()]
            }
            return val;
        }
        return JSON5.parse(JSON5.stringify(obj, replacer))
    }
}
// Prepare web elements.
var svg = d3.select("div.graph")
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .style("background-color", "#333333")
    .style("border-radius", "8px");

svg.append("g")
    .append("text")
    .attr("class", "axis")
    .attr("x", 48)
    .attr("y", 24)
    .style("text-anchor", "end")
    .text("Profit");

var tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("z-index", 10)
    .style("visibility", "hidden")
    .style("background", "rgb(0, 0, 0)")
    .style("background", "rgba(0, 0, 0, 0.75)")
    .style("padding", "8px")
    .style("border-radius", "8px")
    .style("border", "2px solid black");

var gAxis = svg.append("g");
var gProfit = svg.append("g");
var gSeedLoss = svg.append("g");
var gFertLoss = svg.append("g");
var gIcons = svg.append("g");
var gTooltips = svg.append("g");

var axisY;
var barsProfit;
var barsSeed;
var barsFert;
var imgIcons;
var barsTooltips;
var options;
var MAX_INT = Number.MAX_SAFE_INTEGER || Number.MAX_VALUE;
let popup = document.getElementById("popup");
let dropZone = document.getElementById("drop_zone");
let objectsDone = false;
let cropsDone = false;
var pierrePrice = 0;
var pierreAdditional = [];
var jojaStock = [];
var otherVanillaStocks = new Map();
var jojaPrice = 0;
var specialPrice = 0;
var specialLocation = "";
var produceobj = {
    name: function () {
        return 'name'
    },
    sellPrice: function () {
        return 'sellPrice'
    },
    image: function () {
        return 'image'
    },
    modName: function () {
        return 'modName'
    }
}

var produce = templateMaker(produceobj)
// array that contains only objects that are made via produce function
const produceList = [];
var cropobj = {
    product: function () {
        return 'product'
    },
    seasons: function () {
        return 'seasons'
    },
    pierrePrice: function () {
        return 'pierrePrice'
    },
    jojaPrice: function () {
        return 'jojaPrice'
    },
    specialPrice: function () {
        return 'specialPrice'
    },
    specialLocation: function () {
        return 'specialLocation'
    },
    growthInit: function () {
        return 'growthInit'
    },
    regrowth: function () {
        return 'regrowth'
    },
    minHarvest: function () {
        return 'minHarvest'
    },
    maxHarvest: function () {
        return 'maxHarvest'
    },
    extraPerFarmerLevel: function () {
        return 'extraPerFarmerLevel'
    },
    extraPerc: function () {
        return 'extraPerc'
    },
    type: function () {
        return 'type'
    },
    modName: function () {
        return 'modName'
    }
}

var crop = templateMaker(cropobj)
// array that contains only objects that are made via produce function
const cropsList = [];

/*
* Formats a specified number, adding separators for thousands.
* @param num The number to format.
* @return Formatted string.
*/
function formatNumber(num) {
    num = num.toFixed(2) + '';
    let x = num.split('.');
    let x1 = x[0];
    let x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}

function openAddItems() {
    popup.classList.add("open-popup");
}

function closeAddItems() {
    popup.classList.remove("open-popup");

}

dropZone.addEventListener("drop", dropHandler)
dropZone.addEventListener("dragover", dragOverHandler)
window.addEventListener('click', function (e) {
    if (!document.getElementById('popup').contains(e.target)) {
        closeAddItems();
    }
});

function dropHandler(ev) {

    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();

    var items = ev.dataTransfer.items;
    for (var i = 0; i < items.length; i++) {
        // webkitGetAsEntry is where the magic happens
        var item = items[i].webkitGetAsEntry();
        if (item) {
            traverseFileTree(item);
        }
    }

}

async function getAllFileEntries(dataTransferItemList) {
    let fileEntries = [];
    // Use BFS to traverse entire directory/file structure
    let queue = [];
    // Unfortunately dataTransferItemList is not iterable i.e. no forEach
    for (let i = 0; i < dataTransferItemList.length; i++) {
        // Note webkitGetAsEntry a non-standard feature and may change
        // Usage is necessary for handling directories
        queue.push(dataTransferItemList[i].webkitGetAsEntry());
    }
    while (queue.length > 0) {
        let entry = queue.shift();
        if (entry.isFile) {
            fileEntries.push(entry);
        } else if (entry.isDirectory) {
            queue.push(...await readAllDirectoryEntries(entry.createReader()));
        }
    }
    return fileEntries;
}

// Get all the entries (files or subdirectories) in a directory
// by calling readEntries until it returns empty array
async function readAllDirectoryEntries(directoryReader) {
    let entries = [];
    let readEntries = await readEntriesPromise(directoryReader);
    while (readEntries.length > 0) {
        entries.push(...readEntries);
        readEntries = await readEntriesPromise(directoryReader);
    }
    return entries;
}

// Wrap readEntries in a promise to make working with readEntries easier
// readEntries will return only some of the entries in a directory
// e.g. Chrome returns at most 100 entries at a time
async function readEntriesPromise(directoryReader) {
    try {
        return await new Promise((resolve, reject) => {
            directoryReader.readEntries(resolve, reject);
        });
    } catch (err) {
        console.log(err);
    }
}


async function traverseFileTree(item, path) {
    path = path || "";


    if (item.isDirectory) {
        // Get folder contents
        var dirReader = item.createReader();

        await readEntriesPromise(dirReader).then(async function (entries) {
            if (path.includes("[JA]") || jaMods.some(it => path.includes(it))) {
                if (path.endsWith("Objects/" + item.name)) {
                    item1 = entries.find(it => it.name.endsWith("json"))
                    if (item1.isFile) {
                        await item1.file(async file => {
                            if (file.name.endsWith("json")) {
                                await file.text().then(async it => {
                                    if (JSON5.parse(it).Category === "Vegetable" || JSON5.parse(it).Category === "Fruit" || JSON5.parse(it).Category === "Flower") {
                                        modName = ""
                                        if (path.includes("[JA]")) {
                                            modName = path.split("/").find(it => it.includes("[JA]")).replace("[JA] ", "")
                                        } else if (jaMods.some(it => path.includes(it))) {
                                            modName = jaMods.find(it => path.includes(it)).replace("[JA] ", "")
                                        }
                                        var img = entries.find(it => it.name.endsWith("png"))
                                        if (img.isFile) {
                                            await img.file(file1 => {
                                                var reader = new FileReader();
                                                reader.readAsDataURL(file1);
                                                reader.onloadend = function () {
                                                    produceList.push(produce({
                                                        name: JSON5.parse(it).Name,
                                                        sellPrice: JSON5.parse(it).Price,
                                                        image: reader.result,
                                                        modName: modName
                                                    }))
                                                }
                                            })

                                        }
                                    }
                                })
                            }
                        })
                    }
                } else if (path.endsWith("Crops/" + item.name)) {
                    item1 = entries.find(it => it.name.endsWith("json"))
                    if (item1.isFile) {
                        await item1.file(async file => {
                            await file.text().then(it => {
                                modName = ""
                                if (path.includes("[JA]")) {
                                    modName = path.split("/").find(it => it.includes("[JA]")).replace("[JA] ", "")
                                } else if (jaMods.some(it => path.includes(it))) {
                                    modName = jaMods.find(it => path.includes(it)).replace("[JA] ", "")
                                }
                                cropObject = JSON5.parse(it)

                                for (var i = 0; i < pierreAdditional.length; i++) {
                                    if (pierreAdditional[i].ItemNames.includes(cropObject.SeedName)) {
                                        pierrePrice = pierreAdditional[i].StockPrice
                                    }
                                }
                                if ('SeedPurchaseFrom' in cropObject) {
                                    if (pierrePrice === 0 && cropObject.SeedPurchaseFrom === "Pierre") {
                                        pierrePrice = cropObject.SeedPurchasePrice
                                    }
                                    else {
                                        specialPrice = cropObject.SeedPurchasePrice
                                        specialLocation = cropObject.SeedPurchaseFrom
                                    }

                                }
                                otherVanillaStocks.forEach((value, key) => {
                                    if (value.find(it => it.ItemNames.includes(cropObject.SeedName)) != null) {
                                        specialPrice = value.find(it => it.ItemNames.includes(cropObject.SeedName)).StockPrice
                                        // remove from key the "Shop" or "Vendor" part and put a space before every capital letter if not already there and not the first letter
                                        specialLocation = key.replace("Shop", "").replace("Vendor","").replace(/([A-Z])/g, ' $1').trim()
                                    }
                                })
                                if ('SeedAdditionalPurchaseData' in cropObject) {
                                    if (cropObject.SeedAdditionalPurchaseData.some(it => it.SeedPurchaseFrom === "Pierre") && pierrePrice === 0) {
                                        pierrePrice = cropObject.SeedAdditionalPurchaseData.find(it => it.SeedPurchaseFrom === "Pierre").SeedPurchasePrice
                                    }
                                    if (specialPrice === 0) {
                                        cropObject.SeedAdditionalPurchaseData.filter(it => it.SeedPurchaseFrom !== "Pierre").forEach(it => {
                                            if (specialPrice < it.SeedPurchasePrice) {
                                                specialPrice = it.SeedPurchasePrice
                                                specialLocation = it.SeedPurchaseFrom
                                            }
                                        })
                                    }
                                }
                                for (var i = 0; i < jojaStock.length; i++) {
                                    if (jojaStock[i].ItemNames.includes(cropObject.SeedName)) {
                                        jojaPrice = jojaStock[i].StockPrice
                                    }
                                }
                                cropsList.push(crop({
                                    product: cropObject.Product,
                                    seasons: cropObject.Seasons,
                                    pierrePrice: pierrePrice,
                                    jojaPrice: jojaPrice,
                                    specialPrice: specialPrice,
                                    specialLocation: specialLocation,
                                    growthInit: cropObject.Phases.reduce((a, b) => a + b, 0),
                                    regrowth: cropObject.RegrowthPhase ?? 0,
                                    minHarvest: cropObject.Bonus.MinimumPerHarvest ?? 1,
                                    maxHarvest: cropObject.Bonus.MaximumPerHarvest ?? 1,
                                    extraPerFarmerLevel: cropObject.Bonus.MaxIncreasePerFarmLevel ?? 0,
                                    extraPerc: cropObject.Bonus.ExtraChance ?? 0,
                                    type: cropObject.Type,
                                    modName: modName,
                                }))
                            })
                        })
                    }
                }
            } else if (item.name.includes("[STF]") || stfMods.some(it => path.includes(it))) {
                item2 = entries.find(it => it.name.includes("shops"))
                if (item2 != null) {
                    await item2.file(async file => {
                        await file.text().then(async it => {
                            shopobj = JSON5.parse(it)
                            for (const shop of shopobj.VanillaShops) {
                                if (shop.ShopName === "PierreShop") {
                                    pierreAdditional.push(...shop.ItemStocks)
                                } else if (shop.ShopName === "JojaShop") {
                                    jojaStock.push(...shop.ItemStocks)
                                } else {
                                    otherVanillaStocks.set(shop.ShopName, shop.ItemStocks)

                                }
                            }
                            for (const shop of shopobj.Shops) {
                                otherVanillaStocks.set(shop.ShopName, shop.ItemStocks)
                            }
                        })
                    })
                }
            }
            async function checkStf(it) {
                if (it.isDirectory) {
                    await readEntriesPromise(it.createReader()).then(await async function (entries1) {
                        manifestItem = await entries1.find(it => it.name.endsWith("manifest.json"))
                        if (manifestItem != null) {

                            if (manifestItem.isFile) {

                                await manifestItem.file(async file => {

                                    await file.text().then(async it => {

                                        json = await JSON5.parse(it)
                                        if ('ContentPackFor' in json) {

                                            if (json.ContentPackFor.UniqueID === "spacechase0.JsonAssets") {
                                                jaMods.push(path + item.name + "/" + entries1[i].name)
                                            } else if (json.ContentPackFor.UniqueID === "Cherry.ShopTileFramework") {
                                                stfMods.push(path + item.name + "/" + entries1[i].name)
                                                return true
                                            }
                                        }
                                    })
                                })
                            }
                        }
                    }).catch(err => {
                        console.log(err)
                        return false
                    })
                }
                return false
            }

            index1 = await entries.forEach(await async function (it, index) {
                await checkStf(it).then(it1 => {
                        if (it1) {
                            return index
                        } else {
                            return -1
                        }
                    }

                )

            })
            for (var i = 0; i < entries.length; i++) {

                if (i < entries.length)
                {

                    if (await entries.findIndex(it => it.name.includes("[STF]")) > -1) {
                        await traverseFileTree(entries[await entries.findIndex(it => it.name.includes("[STF]"))], path + item.name + "/" + entries[i].name);
                        entries.splice(await entries.findIndex(it => it.name.includes("[STF]")), 1);
                    } else if (index1 > -1) {
                        await traverseFileTree(entries[index1], path + item.name + "/" + entries[index1].name);
                        entries.splice(index1, 1);

                    }
                    await traverseFileTree(entries[i], path + "/" + entries[i].name);
                    if (i === entries.length - 1 && (path.endsWith("Objects") || path.endsWith("Crops"))) {
                        if (!objectsDone) objectsDone = produceList.length > 0
                        if (!cropsDone) cropsDone = cropsList.length > 0
                        if (objectsDone && cropsDone)
                            loadCrops();
                    }
                }
            }
        });
    }
}
function removeItemAll(arr, value) {
    var i = 0;
    while (i < arr.length) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        } else {
            ++i;
        }
    }
    return arr;
}
function loadCrops() {
    for (i = 0; i < cropsList.length; i++) {
        let crop = cropsList[i];
        const produce = produceList.find(it => (it.name.toLowerCase() === crop.product.toLowerCase()) && (it.modName === crop.modName));

        function getRegrowth() {
            if (crop.regrowth === -1) {
                return 0
            } else {
                return crop.regrowth
            }
        }

        function getJar() {
            if (crop.type === "Fruit") {
                return "Jelly"
            } else {
                return "Pickles"
            }
        }

        function getKeg() {
            if (crop.type === "Fruit") {
                return "Wine"
            } else {
                return "Juice"
            }
        }

        const regrowth = getRegrowth();
        const jar = getJar();
        const keg = getKeg();
        if (!Object.keys(crops).some(it => it === produce.name.toLowerCase().replaceAll(/\s+/g, ''))) {
            crops[produce.name.toLowerCase().replaceAll(/\s+/g, '')] = {
                "name": produce.name + " (" + crop.modName + ")",
                "url": "",
                "img": produce.image,
                "seeds": {
                    "pierre": crop.pierrePrice,
                    "joja": crop.jojaPrice,
                    "special": crop.specialPrice,
                    "specialLocation": crop.specialLocation
                },
                "growth": {
                    "initial": crop.growthInit,
                    "regrow": regrowth
                },
                "produce": {
                    "minHarvest": crop.minHarvest,
                    "maxHarvest": crop.maxHarvest,
                    "extraPerFarmerLevel": crop.extraPerFarmerLevel,
                    "extraPerc": crop.extraPerc,
                    "price": produce.sellPrice,
                    "jarType": jar,
                    "kegType": keg
                }
            }
            crop.seasons.forEach(season => {
                seasons.find(it => it.name.toLowerCase() === season.toLowerCase()).crops.push(crops[produce.name.toLowerCase().replaceAll(/\s+/g, '')])
            })
            seasons.find(it => it.name.toLowerCase() === "greenhouse").crops.push(crops[produce.name.toLowerCase().replaceAll(/\s+/g, '')])

        }

    }
    rebuild()
    closeAddItems()
}

function dragOverHandler(ev) {
    ev.preventDefault();
}

/*
 * Calculates the maximum number of harvests for a crop, specified days, season, etc.
 * @param cropID The ID of the crop to calculate. This corresponds to the crop number of the selected season.
 * @return Number of harvests for the specified crop.
 */
function harvests(cropID) {
    var crop = seasons[options.season].crops[cropID];
    var fertilizer = fertilizers[options.fertilizer];
    // Tea blooms every day for the last 7 days of a season
    var isTea = crop.name == "Tea Leaves";

    // if the crop is NOT cross season, remove 28 extra days for each extra season
    var remainingDays = options.days - 28;
    if (options.crossSeason && options.season != 4) {
        var i = options.season + 1;
        if (i >= 4)
            i = 0;
        for (var j = 0; j < seasons[i].crops.length; j++) {
            var seasonCrop = seasons[i].crops[j];
            if (crop.name == seasonCrop.name) {
                remainingDays += 28;
                break;
            }
        }
    } else {
        remainingDays = options.days;
    }

    // console.log("=== " + crop.name + " ===");

    var harvests = 0;
    var day = 1;

    if (options.skills.agri)
        day += Math.floor(crop.growth.initial * (fertilizer.growth - 0.1));
    else
        day += Math.floor(crop.growth.initial * fertilizer.growth);

    if (day <= remainingDays && (!isTea || ((day - 1) % 28 + 1) > 21))
        harvests++;

    while (day <= remainingDays) {
        if (crop.growth.regrow > 0) {
            // console.log("Harvest on day: " + day);
            day += crop.growth.regrow;
        } else {
            // console.log("Harvest on day: " + day);
            if (options.skills.agri)
                day += Math.floor(crop.growth.initial * (fertilizer.growth - 0.1));
            else
                day += Math.floor(crop.growth.initial * fertilizer.growth);
        }

        if (day <= remainingDays && (!isTea || ((day - 1) % 28 + 1) > 21))
            harvests++;
    }

    // console.log("Harvests: " + harvests);
    return harvests;
}

/*
 * Calculates the minimum cost of a single packet of seeds.
 * @param crop The crop object, containing all the crop data.
 * @return The minimum cost of a packet of seeds, taking options into account.
 */
function minSeedCost(crop) {
    var minSeedCost = Infinity;

    if (crop.seeds.pierre != 0 && options.seeds.pierre && crop.seeds.pierre < minSeedCost)
        minSeedCost = crop.seeds.pierre;
    if (crop.seeds.joja != 0 && options.seeds.joja && crop.seeds.joja < minSeedCost)
        minSeedCost = crop.seeds.joja;
    if (crop.seeds.special != 0 && options.seeds.special && crop.seeds.special < minSeedCost)
        minSeedCost = crop.seeds.special;
    if (crop.seeds.pierre === 0 && crop.seeds.joja === 0 && crop.seeds.special === 0)
        minSeedCost = 0;
    return minSeedCost;
}

/*
 * Calculates the number of crops planted.
 * @param crop The crop object, containing all the crop data.
 * @return The number of crops planted, taking the desired number planted and the max seed money into account.
 */
function planted(crop) {
    if (options.buySeed && options.maxSeedMoney !== 0) {
        return Math.min(options.planted, Math.floor(options.maxSeedMoney / minSeedCost(crop)));
    } else {
        return options.planted;
    }
}

/*
 * Calculates the ratios of different crop ratings based on fertilizer level and player farming level
 * Math is from Crop.harvest(...) game logic
 *
 * @param fertilizer The level of the fertilizer (none:0, basic:1, quality:2, deluxe:3)
 * @param level The total farming skill level of the player
 * @return Object containing ratios of iridium, gold, silver, and unrated crops liklihood
 */
function levelRatio(fertilizer, level, isWildseed) {
    var ratio = {};

    if (isWildseed) {
        // All wild crops are iridium if botanist is selected
        if (options.skills.botanist)
            ratio.ratioI = 1;
        else
            ratio.ratioI = 0;
        // Gold foraging is at a rate of foraging level/30 (and not iridium)
        ratio.ratioG = level / 30.0 * (1 - ratio.ratioI);
        // Silver is at a rate of foraging level/15 (and not gold or iridium)
        ratio.ratioS = level / 15.0 * (1 - ratio.ratioG - ratio.ratioI);
        // Normal is the remaining rate
        ratio.ratioN = 1 - ratio.ratioS - ratio.ratioG - ratio.ratioI;
    } else {
        // Iridium is available on deluxe fertilizer at 1/2 gold ratio
        ratio.ratioI = fertilizer >= 3 ? (0.2 * (level / 10.0) + 0.2 * fertilizer * ((level + 2) / 12.0) + 0.01) / 2 : 0;
        // Calculate gold times probability of not iridium
        ratio.ratioG = (0.2 * (level / 10.0) + 0.2 * fertilizer * ((level + 2) / 12.0) + 0.01) * (1.0 - ratio.ratioI);
        // Probability of silver capped at .75, times probability of not gold/iridium
        if (fertilizer < 3) {
            ratio.ratioS = Math.max(0, Math.min(0.75, ratio.ratioG * 2.0) * (1.0 - ratio.ratioG - ratio.ratioI));
            // Probability of not the other ratings
            ratio.ratioN = Math.max(0, 1.0 - ratio.ratioS - ratio.ratioG - ratio.ratioI);
        } else {
            ratio.ratioS = Math.max(0, 1.0 - ratio.ratioG - ratio.ratioI);
            ratio.ratioN = 0
        }
    }
    return ratio;
}

/*
 * Calculates the profit for a specified crop.
 * @param crop The crop object, containing all the crop data.
 * @return The total profit.
 */
function profit(crop) {
    var num_planted = planted(crop);
    var total_harvests = crop.harvests * num_planted;
    var fertilizer = fertilizers[options.fertilizer];
    var produce = options.produce;

    var useLevel = options.level;
    if (crop.isWildseed)
        useLevel = options.foragingLevel;

    var {ratioN, ratioS, ratioG, ratioI} = levelRatio(fertilizer.ratio, useLevel + options.foodLevel, crop.isWildseed);

    if (crop.name == "Tea Leaves") ratioN = 1, ratioS = ratioG = ratioI = 0;
    var profit = 0;

    //Skip keg/jar calculations for ineligible crops (where corp.produce.jar or crop.produce.keg = 0)

    var userawproduce = false;

    switch (produce) {
        case 0:
            userawproduce = true;
            break;
        case 1:
            if (crop.produce.jarType == null) userawproduce = true;
            break;
        case 2:
            if (crop.produce.kegType == null) userawproduce = true;
            break;
    }

    // console.log("Calculating raw produce value for: " + crop.name);

    if (produce == 0 || userawproduce) {
        profit += crop.produce.price * ratioN * total_harvests;
        profit += Math.trunc(crop.produce.price * 1.25) * ratioS * total_harvests;
        profit += Math.trunc(crop.produce.price * 1.5) * ratioG * total_harvests;
        profit += crop.produce.price * 2 * ratioI * total_harvests;
        // console.log("Profit (After normal produce): " + profit);
        let extraProduce = 0;
        if (crop.produce.extraPerFarmerLevel > 0)
            extraProduce = Math.floor((crop.produce.minHarvest + (crop.produce.maxHarvest + Math.floor((options.level + options.foodLevel) / crop.produce.extraPerFarmerLevel))) / 2) - 1;
        else
            extraProduce = Math.floor((crop.produce.minHarvest + crop.produce.maxHarvest) / 2) - 1;
        if (extraProduce > 0) {
            profit += crop.produce.price * extraProduce * total_harvests;
            // console.log("Profit (After extra produce): " + profit);
        }
        if (crop.produce.extraPerc > 0) {
            profit += crop.produce.price * Math.floor(((1 / (1 - Math.min(crop.produce.extraPerc, 0.9)))-1)* total_harvests) ;
            // console.log("Profit (After extra produce): " + profit);
        }


        if (options.skills.till) {
            profit *= 1.1;
            // console.log("Profit (After skills): " + profit);
        }
    } else {
        var items = total_harvests;
        if (crop.produce.extraPerFarmerLevel > 0)
            items += (Math.floor((crop.produce.minHarvest + (crop.produce.maxHarvest + ((options.level + options.foodLevel) / crop.produce.extraPerFarmerLevel))) / 2) - 1) * total_harvests;
        else
            items += (Math.floor((crop.produce.minHarvest + crop.produce.maxHarvest) / 2) - 1) * total_harvests;
        items += Math.floor(1 / (1 - Math.min(crop.produce.extraPerc, 0.9))) * total_harvests;
        var kegModifier = crop.produce.kegType === "Wine" ? 3 : 2.25;

        switch (produce) {
            case 1:
                profit += items * (crop.produce.price * 2 + 50);
                break;
            case 2:
                profit += items * (crop.produce.keg != null ? crop.produce.keg : crop.produce.price * kegModifier);
                break;
        }

        if (options.skills.arti) {
            profit *= 1.4;
        }
    }


    if (options.buySeed) {
        profit += crop.seedLoss;
        // console.log("Profit (After seeds): " + profit);
    }

    if (options.buyFert) {
        profit += crop.fertLoss;
        // console.log("Profit (After fertilizer): " + profit);
    }

    let profitData = {}
    profitData.profit = profit;
    profitData.ratioN = ratioN;
    profitData.ratioS = ratioS;
    profitData.ratioG = ratioG;
    profitData.ratioI = ratioI;

    // console.log("Profit: " + profit);
    return profitData;
}

/*
 * Calculates the loss to profit when seeds are bought.
 * @param crop The crop object, containing all the crop data.
 * @return The total loss.
 */
function seedLoss(crop) {
    var harvests = crop.harvests;

    var loss = -minSeedCost(crop);

    if (crop.growth.regrow == 0 && harvests > 0)
        loss = loss * harvests;

    return loss * planted(crop);
}

/*
 * Calculates the loss to profit when fertilizer is bought.
 *
 * Note that harvesting does not destroy fertilizer, so this is
 * independent of the number of harvests.
 *
 * @param crop The crop object, containing all the crop data.
 * @return The total loss.
 */
function fertLoss(crop) {
    var loss;
    if (options.fertilizer == 4 && options.fertilizerSource == 1)
        loss = -fertilizers[options.fertilizer].alternate_cost;
    else
        loss = -fertilizers[options.fertilizer].cost;
    return loss * planted(crop);
}

/*
 * Converts any value to the average per day value.
 * @param value The value to convert.
 * @return Value per day.
 */
function perDay(value) {
    return value / options.days;
}

/*
 * Performs filtering on a season's crop list, saving the new list to the cropList array.
 */
function fetchCrops() {
    cropList = [];

    var season = seasons[options.season];

    for (var i = 0; i < season.crops.length; i++) {
        if ((options.seeds.pierre && season.crops[i].seeds.pierre != 0) ||
            (options.seeds.joja && season.crops[i].seeds.joja != 0) ||
            (options.seeds.special && season.crops[i].seeds.special != 0) || (options.costlessSeeds && (season.crops[i].seeds.pierre === 0 && season.crops[i].seeds.joja === 0 && season.crops[i].seeds.special === 0 ))) {
            cropList.push(JSON5.parse(JSON5.stringify(season.crops[i])));
            cropList[cropList.length - 1].id = i;
        }
    }
}

/*
 * Calculates all profits and losses for all crops in the cropList array.
 */
function valueCrops() {
    for (var i = 0; i < cropList.length; i++) {
        if (cropList[i].isWildseed && options.skills.gatherer) {
            cropList[i].produce.minHarvest += 1;
            if (cropList[i].produce.maxHarvest < cropsList[i].produce.minHarvest)
                cropsList[i].produce.maxHarvest += 1;
            cropList[i].produce.extraPerc += 0.2;
        }
        cropList[i].planted = planted(cropList[i]);
        cropList[i].harvests = harvests(cropList[i].id);
        cropList[i].seedLoss = seedLoss(cropList[i]);
        cropList[i].fertLoss = fertLoss(cropList[i]);
        cropList[i].profitData = profit(cropList[i]);
        cropList[i].profit = cropList[i].profitData.profit;
        cropList[i].averageProfit = perDay(cropList[i].profit);
        cropList[i].averageSeedLoss = perDay(cropList[i].seedLoss);
        cropList[i].averageFertLoss = perDay(cropList[i].fertLoss);
        if (options.average) {
            cropList[i].drawProfit = cropList[i].averageProfit;
            cropList[i].drawSeedLoss = cropList[i].averageSeedLoss;
            cropList[i].drawFertLoss = cropList[i].averageFertLoss;
        } else {
            cropList[i].drawProfit = cropList[i].profit;
            cropList[i].drawSeedLoss = cropList[i].seedLoss;
            cropList[i].drawFertLoss = cropList[i].fertLoss;
        }
    }
}

/*
 * Sorts the cropList array, so that the most profitable crop is the first one.
 */
function sortCrops() {
    var swapped;
    do {
        swapped = false;
        for (var i = 0; i < cropList.length - 1; i++) {
            if (cropList[i].drawProfit < cropList[i + 1].drawProfit) {
                var temp = cropList[i];
                cropList[i] = cropList[i + 1];
                cropList[i + 1] = temp;
                swapped = true;
            }
        }
    } while (swapped);


    // console.log("==== SORTED ====");
    for (var i = 0; i < cropList.length; i++) {
        // console.log(cropList[i].drawProfit.toFixed(2) + "  " + cropList[i].name);
    }
}

/*
 * Updates the X D3 scale.
 * @return The new scale.
 */
function updateScaleX() {
    return d3.scale.ordinal()
        .domain(d3.range(seasons[4].crops.length))
        .rangeRoundBands([0, width]);
}

/*
 * Updates the Y D3 scale.
 * @return The new scale.
 */
function updateScaleY() {
    return d3.scale.linear()
        .domain([0, d3.max(cropList, function (d) {
            if (d.drawProfit >= 0) {
                return (~~((d.drawProfit + 99) / 100) * 100);
            } else {
                var profit = d.drawProfit;
                if (options.buySeed) {
                    if (d.seedLoss < profit)
                        profit = d.drawSeedLoss;
                }
                if (options.buyFert) {
                    if (d.fertLoss < profit)
                        profit = d.drawFertLoss;
                }
                return (~~((-profit + 99) / 100) * 100);
            }
        })])
        .range([height, 0]);
}

/*
 * Updates the axis D3 scale.
 * @return The new scale.
 */
function updateScaleAxis() {
    return d3.scale.linear()
        .domain([
            -d3.max(cropList, function (d) {
                if (d.drawProfit >= 0) {
                    return (~~((d.drawProfit + 99) / 100) * 100);
                } else {
                    var profit = d.drawProfit;
                    if (options.buySeed) {
                        if (d.seedLoss < profit)
                            profit = d.drawSeedLoss;
                    }
                    if (options.buyFert) {
                        if (d.fertLoss < profit)
                            profit = d.drawFertLoss;
                    }
                    return (~~((-profit + 99) / 100) * 100);
                }
            }),
            d3.max(cropList, function (d) {
                if (d.drawProfit >= 0) {
                    return (~~((d.drawProfit + 99) / 100) * 100);
                } else {
                    var profit = d.drawProfit;
                    if (options.buySeed) {
                        if (d.seedLoss < profit)
                            profit = d.drawSeedLoss;
                    }
                    if (options.buyFert) {
                        if (d.fertLoss < profit)
                            profit = d.drawFertLoss;
                    }
                    return (~~((-profit + 99) / 100) * 100);
                }
            })])
        .range([height * 2, 0]);
}

/*
 * Renders the graph.
 * This is called only when opening for the first time or when changing seasons/seeds.
 */
function renderGraph() {

    var x = updateScaleX();
    var y = updateScaleY();
    var ax = updateScaleAxis();

    svg.attr("width", barOffsetX + barPadding * 2 + (barWidth + barPadding) * cropList.length);
    d3.select(".graph").attr("width", barOffsetX + barPadding * 2 + (barWidth + barPadding) * cropList.length);

    var yAxis = d3.svg.axis()
        .scale(ax)
        .orient("left")
        .tickFormat(d3.format(",s"))
        .ticks(16);

    axisY = gAxis.attr("class", "axis")
        .call(yAxis)
        .attr("transform", "translate(48, " + barOffsetY + ")");

    barsProfit = gProfit.selectAll("rect")
        .data(cropList)
        .enter()
        .append("rect")
        .attr("x", function (d, i) {
            if (d.drawProfit < 0 && options.buySeed && options.buyFert)
                return x(i) + barOffsetX + (barWidth / miniBar) * 2;
            else if (d.drawProfit < 0 && !options.buySeed && options.buyFert)
                return x(i) + barOffsetX + barWidth / miniBar;
            else if (d.drawProfit < 0 && options.buySeed && !options.buyFert)
                return x(i) + barOffsetX + barWidth / miniBar;
            else
                return x(i) + barOffsetX;
        })
        .attr("y", function (d) {
            if (d.drawProfit >= 0)
                return y(d.drawProfit) + barOffsetY;
            else
                return height + barOffsetY;
        })
        .attr("height", function (d) {
            if (d.drawProfit >= 0)
                return height - y(d.drawProfit);
            else
                return height - y(-d.drawProfit);
        })
        .attr("width", function (d) {
            if (d.drawProfit < 0 && options.buySeed && options.buyFert)
                return barWidth - (barWidth / miniBar) * 2;
            else if (d.drawProfit < 0 && !options.buySeed && options.buyFert)
                return barWidth - barWidth / miniBar;
            else if (d.drawProfit < 0 && options.buySeed && !options.buyFert)
                return barWidth - barWidth / miniBar;
            else
                return barWidth;
        })
        .attr("fill", function (d) {
            if (d.drawProfit >= 0)
                return "lime";
            else
                return "red";
        });

    barsSeed = gSeedLoss.selectAll("rect")
        .data(cropList)
        .enter()
        .append("rect")
        .attr("x", function (d, i) {
            return x(i) + barOffsetX;
        })
        .attr("y", height + barOffsetY)
        .attr("height", function (d) {
            if (options.buySeed)
                return height - y(-d.drawSeedLoss);
            else
                return 0;
        })
        .attr("width", barWidth / miniBar)
        .attr("fill", "orange");

    barsFert = gFertLoss.selectAll("rect")
        .data(cropList)
        .enter()
        .append("rect")
        .attr("x", function (d, i) {
            if (options.buySeed)
                return x(i) + barOffsetX + barWidth / miniBar;
            else
                return x(i) + barOffsetX;
        })
        .attr("y", height + barOffsetY)
        .attr("height", function (d) {
            if (options.buyFert)
                return height - y(-d.drawFertLoss);
            else
                return 0;
        })
        .attr("width", barWidth / miniBar)
        .attr("fill", "brown");

    imgIcons = gIcons.selectAll("image")
        .data(cropList)
        .enter()
        .append("svg:image")
        .attr("x", function (d, i) {
            return x(i) + barOffsetX;
        })
        .attr("y", function (d) {
            if (d.drawProfit >= 0)
                return y(d.drawProfit) + barOffsetY - barWidth - barPadding;
            else
                return height + barOffsetY - barWidth - barPadding;
        })
        .attr('width', barWidth)
        .attr('height', barWidth)
        .attr("href", function (d) {
            return d.img;
        });

    barsTooltips = gTooltips.selectAll("rect")
        .data(cropList)
        .enter()
        .append("rect")
        .attr("x", function (d, i) {
            return x(i) + barOffsetX - barPadding / 2;
        })
        .attr("y", function (d) {
            if (d.drawProfit >= 0)
                return y(d.drawProfit) + barOffsetY - barWidth - barPadding;
            else
                return height + barOffsetY - barWidth - barPadding;
        })
        .attr("height", function (d) {
            var topHeight = 0;

            if (d.drawProfit >= 0)
                topHeight = height + barWidth + barPadding - y(d.drawProfit);
            else
                topHeight = barWidth + barPadding;

            var lossArray = [0];

            if (options.buySeed)
                lossArray.push(d.drawSeedLoss);
            if (options.buyFert)
                lossArray.push(d.drawFertLoss);
            if (d.drawProfit < 0)
                lossArray.push(d.drawProfit);

            var swapped;
            do {
                swapped = false;
                for (var i = 0; i < lossArray.length - 1; i++) {
                    if (lossArray[i] > lossArray[i + 1]) {
                        var temp = lossArray[i];
                        lossArray[i] = lossArray[i + 1];
                        lossArray[i + 1] = temp;
                        swapped = true;
                    }
                }
            } while (swapped);

            return topHeight + (height - y(-lossArray[0]));
        })
        .attr("width", barWidth + barPadding)
        .attr("opacity", "0")
        .attr("cursor", "pointer")
        .on("mouseover", function (d) {
            tooltip.selectAll("*").remove();
            tooltip.style("visibility", "visible");

            tooltip.append("h3").attr("class", "tooltipTitle").text(d.name);

            var tooltipTable = tooltip.append("table")
                .attr("class", "tooltipTable")
                .attr("cellspacing", 0);
            var tooltipTr;


            tooltipTr = tooltipTable.append("tr");
            tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Total profit:");
            if (d.profit > 0)
                tooltipTr.append("td").attr("class", "tooltipTdRightPos").text("+" + formatNumber(d.profit))
                    .append("div").attr("class", "gold");
            else
                tooltipTr.append("td").attr("class", "tooltipTdRightNeg").text(formatNumber(d.profit))
                    .append("div").attr("class", "gold");

            tooltipTr = tooltipTable.append("tr");
            tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Profit per day:");
            if (d.averageProfit > 0)
                tooltipTr.append("td").attr("class", "tooltipTdRightPos").text("+" + formatNumber(d.averageProfit))
                    .append("div").attr("class", "gold");
            else
                tooltipTr.append("td").attr("class", "tooltipTdRightNeg").text(formatNumber(d.averageProfit))
                    .append("div").attr("class", "gold");

            if (options.buySeed) {
                tooltipTr = tooltipTable.append("tr");
                tooltipTr.append("td").attr("class", "tooltipTdLeftSpace").text("Total seed loss:");
                tooltipTr.append("td").attr("class", "tooltipTdRightNeg").text(formatNumber(d.seedLoss))
                    .append("div").attr("class", "gold");

                tooltipTr = tooltipTable.append("tr");
                tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Seed loss per day:");
                tooltipTr.append("td").attr("class", "tooltipTdRightNeg").text(formatNumber(d.averageSeedLoss))
                    .append("div").attr("class", "gold");
            }

            if (options.buyFert) {
                tooltipTr = tooltipTable.append("tr");
                tooltipTr.append("td").attr("class", "tooltipTdLeftSpace").text("Total fertilizer loss:");
                tooltipTr.append("td").attr("class", "tooltipTdRightNeg").text(formatNumber(d.fertLoss))
                    .append("div").attr("class", "gold");

                tooltipTr = tooltipTable.append("tr");
                tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Fertilizer loss per day:");
                tooltipTr.append("td").attr("class", "tooltipTdRightNeg").text(formatNumber(d.averageFertLoss))
                    .append("div").attr("class", "gold");
            }


            //Ineligible crops are sold raw.
            tooltipTr = tooltipTable.append("tr");
            tooltipTr.append("td").attr("class", "tooltipTdLeftSpace").text("Produce sold:");
            switch (options.produce) {
                case 0:
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text("Raw crops");
                    break;
                case 1:
                    if (d.produce.jarType != null)
                        tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.produce.jarType);
                    else
                        tooltipTr.append("td").attr("class", "tooltipTdRightNeg").text("Raw crops");
                    break;
                case 2:
                    if (d.produce.kegType != null)
                        tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.produce.kegType);
                    else
                        tooltipTr.append("td").attr("class", "tooltipTdRightNeg").text("Raw crops");
                    break;
            }
            tooltipTr = tooltipTable.append("tr");
            tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Duration:");
            tooltipTr.append("td").attr("class", "tooltipTdRight").text(options.days + " days");
            tooltipTr = tooltipTable.append("tr");
            tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Planted:");
            tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.planted);
            tooltipTr = tooltipTable.append("tr");
            tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Harvests:");
            tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.harvests);

            if (options.extra) {
                var kegModifier = d.produce.kegType === "Wine" ? 3 : 2.25;
                var kegPrice = d.produce.keg != null ? d.produce.keg : d.produce.price * kegModifier;

                tooltip.append("h3").attr("class", "tooltipTitleExtra").text("Crop info");
                tooltipTable = tooltip.append("table")
                    .attr("class", "tooltipTable")
                    .attr("cellspacing", 0);

                if (!(d.isWildseed && options.skills.botanist)) {
                    tooltipTr = tooltipTable.append("tr");
                    if (!fertilizers[options.fertilizer].ratio >= 3) {
                        tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Value (Normal):");
                        tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.produce.price)
                            .append("div").attr("class", "gold");
                        tooltipTr.append("td").attr("class", "tooltipTdRight").text("(" + (d.profitData.ratioN * 100).toFixed(0) + "%)");
                    }
                }
                if (d.name != "Tea Leaves") {
                    if (!(d.isWildseed && options.skills.botanist)) {
                        tooltipTr = tooltipTable.append("tr");
                        tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Value (Silver):");
                        tooltipTr.append("td").attr("class", "tooltipTdRight").text(Math.trunc(d.produce.price * 1.25))
                            .append("div").attr("class", "gold");
                        tooltipTr.append("td").attr("class", "tooltipTdRight").text("(" + (d.profitData.ratioS * 100).toFixed(0) + "%)");
                        tooltipTr = tooltipTable.append("tr");
                        tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Value (Gold):");
                        tooltipTr.append("td").attr("class", "tooltipTdRight").text(Math.trunc(d.produce.price * 1.5))
                            .append("div").attr("class", "gold");
                        tooltipTr.append("td").attr("class", "tooltipTdRight").text("(" + (d.profitData.ratioG * 100).toFixed(0) + "%)");
                    }
                    if ((!d.isWildseed && fertilizers[options.fertilizer].ratio >= 3) || (d.isWildseed && options.skills.botanist)) {
                        tooltipTr = tooltipTable.append("tr");
                        tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Value (Iridium):");
                        tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.produce.price * 2)
                            .append("div").attr("class", "gold");
                        tooltipTr.append("td").attr("class", "tooltipTdRight").text("(" + (d.profitData.ratioI * 100).toFixed(0) + "%)");
                    }
                }
                tooltipTr = tooltipTable.append("tr");
                if (d.produce.jarType != null) {
                    tooltipTr.append("td").attr("class", "tooltipTdLeftSpace").text("Value (" + d.produce.jarType + "):");
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.produce.price * 2 + 50)
                        .append("div").attr("class", "gold");
                } else {
                    tooltipTr.append("td").attr("class", "tooltipTdLeftSpace").text("Value (Jar):");
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text("None");
                }
                tooltipTr = tooltipTable.append("tr");
                if (d.produce.kegType) {
                    tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Value (" + d.produce.kegType + "):");
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text(kegPrice)
                        .append("div").attr("class", "gold");
                } else {
                    tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Value (Keg):");
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text("None");
                }


                var first = true;
                if (d.seeds.pierre > 0) {
                    tooltipTr = tooltipTable.append("tr");
                    tooltipTr.append("td").attr("class", "tooltipTdLeftSpace").text("Seeds (Pierre):");
                    first = false;
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.seeds.pierre)
                        .append("div").attr("class", "gold");
                }
                if (d.seeds.joja > 0) {
                    tooltipTr = tooltipTable.append("tr");
                    if (first) {
                        tooltipTr.append("td").attr("class", "tooltipTdLeftSpace").text("Seeds (Joja):");
                        first = false;
                    } else
                        tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Seeds (Joja):");
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.seeds.joja)
                        .append("div").attr("class", "gold");
                }
                if (d.seeds.special > 0) {
                    tooltipTr = tooltipTable.append("tr");
                    if (first) {
                        tooltipTr.append("td").attr("class", "tooltipTdLeftSpace").text("Seeds (Special):");
                        first = false;
                    } else
                        tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Seeds (Special):");
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.seeds.special)
                        .append("div").attr("class", "gold");
                    tooltipTr = tooltipTable.append("tr");
                    tooltipTr.append("td").attr("class", "tooltipTdLeft").text("");
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.seeds.specialLoc);
                }

                tooltipTr = tooltipTable.append("tr");
                tooltipTr.append("td").attr("class", "tooltipTdLeftSpace").text("Time to grow:");
                tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.growth.initial + " days");
                tooltipTr = tooltipTable.append("tr");
                tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Time to regrow:");
                if (d.growth.regrow > 0)
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.growth.regrow + " days");
                else
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text("N/A");

                    tooltipTr = tooltipTable.append("tr");
                    tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Amount per harvest:");
                    if (d.produce.extraPerFarmerLevel > 0) {
                        if (d.produce.minHarvest !== (d.produce.maxHarvest + Math.floor((options.level + options.foodLevel) / d.produce.extraPerFarmerLevel)))
                            tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.produce.minHarvest + " - " + (d.produce.maxHarvest + Math.floor((options.level + options.foodLevel) / d.produce.extraPerFarmerLevel)) + " (" + Math.floor((options.level + options.foodLevel) / d.produce.extraPerFarmerLevel) + " Bonus from farmer level)");
                        else
                            tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.produce.minHarvest);
                    } else if (d.produce.minHarvest > 1){
                        if (d.produce.minHarvest !== d.produce.maxHarvest)
                            tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.produce.minHarvest + " - " + d.produce.maxHarvest);
                        else
                            tooltipTr.append("td").attr("class", "tooltipTdRight").text(d.produce.minHarvest);
                    }



                if (d.produce.extraPerc > 0) {
                    tooltipTr = tooltipTable.append("tr");
                    tooltipTr.append("td").attr("class", "tooltipTdLeft").text("Extra chance:");
                    tooltipTr.append("td").attr("class", "tooltipTdRight").text((d.produce.extraPerc * 100) + "%");
                }


            }
        })

        .on("mousemove", function () {
            tooltip.style("top", (d3.event.pageY - 16) + "px").style("left", (d3.event.pageX + 20) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
        })
        .on("click", function (d) {
            window.open(d.url, "_blank");
        });
}

/*
 * Updates the already rendered graph, showing animations.
 */
function updateGraph() {
    var x = updateScaleX();
    var y = updateScaleY();
    var ax = updateScaleAxis();

    var yAxis = d3.svg.axis()
        .scale(ax)
        .orient("left")
        .tickFormat(d3.format(",s"))
        .ticks(16);

    axisY.transition()
        .call(yAxis);

    barsProfit.data(cropList)
        .transition()
        .attr("x", function (d, i) {
            if (d.drawProfit < 0 && options.buySeed && options.buyFert)
                return x(i) + barOffsetX + (barWidth / miniBar) * 2;
            else if (d.drawProfit < 0 && !options.buySeed && options.buyFert)
                return x(i) + barOffsetX + barWidth / miniBar;
            else if (d.drawProfit < 0 && options.buySeed && !options.buyFert)
                return x(i) + barOffsetX + barWidth / miniBar;
            else
                return x(i) + barOffsetX;
        })
        .attr("y", function (d) {
            if (d.drawProfit >= 0)
                return y(d.drawProfit) + barOffsetY;
            else
                return height + barOffsetY;
        })
        .attr("height", function (d) {
            if (d.drawProfit >= 0)
                return height - y(d.drawProfit);
            else
                return height - y(-d.drawProfit);
        })
        .attr("width", function (d) {
            if (d.drawProfit < 0 && options.buySeed && options.buyFert)
                return barWidth - (barWidth / miniBar) * 2;
            else if (d.drawProfit < 0 && !options.buySeed && options.buyFert)
                return barWidth - barWidth / miniBar;
            else if (d.drawProfit < 0 && options.buySeed && !options.buyFert)
                return barWidth - barWidth / miniBar;
            else
                return barWidth;
        })
        .attr("fill", function (d) {
            if (d.drawProfit >= 0)
                return "lime";
            else
                return "red";
        });

    barsSeed.data(cropList)
        .transition()
        .attr("x", function (d, i) {
            return x(i) + barOffsetX;
        })
        .attr("y", height + barOffsetY)
        .attr("height", function (d) {
            if (options.buySeed)
                return height - y(-d.drawSeedLoss);
            else
                return 0;
        })
        .attr("width", barWidth / miniBar)
        .attr("fill", "orange");

    barsFert.data(cropList)
        .transition()
        .attr("x", function (d, i) {
            if (options.buySeed)
                return x(i) + barOffsetX + barWidth / miniBar;
            else
                return x(i) + barOffsetX;
        })
        .attr("y", height + barOffsetY)
        .attr("height", function (d) {
            if (options.buyFert)
                return height - y(-d.drawFertLoss);
            else
                return 0;
        })
        .attr("width", barWidth / miniBar)
        .attr("fill", "brown");

    imgIcons.data(cropList)
        .attr("href", function (d) {

            return d.img;
        })
        .transition()
        .attr("x", function (d, i) {
            return x(i) + barOffsetX;
        })
        .attr("y", function (d) {
            if (d.drawProfit >= 0)
                return y(d.drawProfit) + barOffsetY - barWidth - barPadding;
            else
                return height + barOffsetY - barWidth - barPadding;
        })
        .attr('width', barWidth)
        .attr('height', barWidth)
        ;

    barsTooltips.data(cropList)
        .transition()
        .attr("x", function (d, i) {
            return x(i) + barOffsetX - barPadding / 2;
        })
        .attr("y", function (d) {
            if (d.drawProfit >= 0)
                return y(d.drawProfit) + barOffsetY - barWidth - barPadding;
            else
                return height + barOffsetY - barWidth - barPadding;
        })
        .attr("height", function (d) {
            var topHeight = 0;

            if (d.drawProfit >= 0)
                topHeight = height + barWidth + barPadding - y(d.drawProfit);
            else
                topHeight = barWidth + barPadding;

            var lossArray = [0];

            if (options.buySeed)
                lossArray.push(d.drawSeedLoss);
            if (options.buyFert)
                lossArray.push(d.drawFertLoss);
            if (d.drawProfit < 0)
                lossArray.push(d.drawProfit);

            var swapped;
            do {
                swapped = false;
                for (var i = 0; i < lossArray.length - 1; i++) {
                    if (lossArray[i] > lossArray[i + 1]) {
                        var temp = lossArray[i];
                        lossArray[i] = lossArray[i + 1];
                        lossArray[i + 1] = temp;
                        swapped = true;
                    }
                }
            } while (swapped);

            return topHeight + (height - y(-lossArray[0]));
        })
        .attr("width", barWidth + barPadding);
}

function updateSeasonNames() {
    if (options.crossSeason) {
        document.getElementById('season_0').innerHTML = "Spring & Summer";
        document.getElementById('season_1').innerHTML = "Summer & Fall";
        document.getElementById('season_2').innerHTML = "Fall & Winter";
        document.getElementById('season_3').innerHTML = "Winter & Spring";
    } else {
        document.getElementById('season_0').innerHTML = "Spring";
        document.getElementById('season_1').innerHTML = "Summer";
        document.getElementById('season_2').innerHTML = "Fall";
        document.getElementById('season_3').innerHTML = "Winter";
    }
}

function updateSeedChance() {

}

/*
 * Updates all options and data, based on the options set in the HTML.
 * After that, filters, values and sorts all the crops again.
 */
function updateData() {

    options.season = parseInt(document.getElementById('select_season').value);
    const isGreenhouse = options.season === 4;

    options.produce = parseInt(document.getElementById('select_produce').value);

    if (document.getElementById('number_planted').value <= 0)
        document.getElementById('number_planted').value = 1;
    options.planted = document.getElementById('number_planted').value;

    if (document.getElementById('max_seed_money').value < 0)
        document.getElementById('max_seed_money').value = '0';
    options.maxSeedMoney = parseInt(document.getElementById('max_seed_money').value);
    if (isNaN(options.maxSeedMoney)) {
        options.maxSeedMoney = 0;
    }

    options.average = document.getElementById('check_average').checked;
    options.costlessSeeds = document.getElementById('check_costless_seeds').checked;
    options.crossSeason = document.getElementById('cross_season').checked;

    if (!isGreenhouse) {
        document.getElementById('current_day_row').style.display = 'table-row';
        document.getElementById('number_days').disabled = true;
        document.getElementById('cross_season_row').style.display = 'table-row';

        if (document.getElementById('current_day').value <= 0)
            document.getElementById('current_day').value = 1;
        if (options.crossSeason) {
            document.getElementById('number_days').value = 56;
            if (document.getElementById('current_day').value > 56)
                document.getElementById('current_day').value = 56;
            options.days = 57 - document.getElementById('current_day').value;
        } else {
            document.getElementById('number_days').value = 28;
            if (document.getElementById('current_day').value > 28)
                document.getElementById('current_day').value = 28;
            options.days = 29 - document.getElementById('current_day').value;
        }
    } else {
        document.getElementById('current_day_row').style.display = 'none';
        document.getElementById('number_days').disabled = false;
        document.getElementById('cross_season_row').style.display = 'none';

        if (document.getElementById('number_days').value > 100000)
            document.getElementById('number_days').value = 100000;
        options.days = document.getElementById('number_days').value;
    }

    options.seeds.pierre = document.getElementById('check_seedsPierre').checked;
    options.seeds.joja = document.getElementById('check_seedsJoja').checked;
    options.seeds.special = document.getElementById('check_seedsSpecial').checked;

    options.buySeed = document.getElementById('check_buySeed').checked;

    options.fertilizer = parseInt(document.getElementById('select_fertilizer').value);

    options.buyFert = document.getElementById('check_buyFert').checked;

    options.fertilizerSource = parseInt(document.getElementById('speed_gro_source').value);

    if (document.getElementById('farming_level').value <= 0)
        document.getElementById('farming_level').value = 1;
    if (document.getElementById('farming_level').value > 13)
        document.getElementById('farming_level').value = 13;
    options.level = parseInt(document.getElementById('farming_level').value);

    if (options.level >= 5) {
        document.getElementById('check_skillsTill').disabled = false;
        document.getElementById('check_skillsTill').style.cursor = "pointer";
        options.skills.till = document.getElementById('check_skillsTill').checked;
    } else {
        document.getElementById('check_skillsTill').disabled = true;
        document.getElementById('check_skillsTill').style.cursor = "default";
        document.getElementById('check_skillsTill').checked = false;
    }

    if (options.level >= 10 && options.skills.till) {
        document.getElementById('select_skills').disabled = false;
        document.getElementById('select_skills').style.cursor = "pointer";
    } else {
        document.getElementById('select_skills').disabled = true;
        document.getElementById('select_skills').style.cursor = "default";
        document.getElementById('select_skills').value = 0;
    }
    if (document.getElementById('select_skills').value == 1) {
        options.skills.agri = true;
        options.skills.arti = false;
    } else if (document.getElementById('select_skills').value == 2) {
        options.skills.agri = false;
        options.skills.arti = true;
    } else {
        options.skills.agri = false;
        options.skills.arti = false;
    }

    if (document.getElementById('foraging_level').value <= 0)
        document.getElementById('foraging_level').value = 1;
    if (document.getElementById('foraging_level').value > 13)
        document.getElementById('foraging_level').value = 13;
    options.foragingLevel = parseInt(document.getElementById('foraging_level').value);

    if (options.foragingLevel >= 5) {
        document.getElementById('check_skillsGatherer').disabled = false;
        document.getElementById('check_skillsGatherer').style.cursor = "pointer";
        options.skills.gatherer = document.getElementById('check_skillsGatherer').checked;
    } else {
        document.getElementById('check_skillsGatherer').disabled = true;
        document.getElementById('check_skillsGatherer').style.cursor = "default";
        document.getElementById('check_skillsGatherer').checked = false;
    }

    if (options.foragingLevel >= 10 && options.skills.gatherer) {
        document.getElementById('check_skillsBotanist').disabled = false;
        document.getElementById('check_skillsBotanist').style.cursor = "pointer";
        options.skills.botanist = document.getElementById('check_skillsBotanist').checked;
    } else {
        document.getElementById('check_skillsBotanist').disabled = true;
        document.getElementById('check_skillsBotanist').style.cursor = "default";
        document.getElementById('check_skillsBotanist').checked = false;
    }

    options.foodIndex = document.getElementById('select_food').value;
    options.foodLevel = parseInt(document.getElementById('select_food').options[options.foodIndex].value);
    if (options.buyFert && options.fertilizer == 4)
        document.getElementById('speed_gro_source').disabled = false;
    else
        document.getElementById('speed_gro_source').disabled = true;

    options.extra = document.getElementById('check_extra').checked;

    updateSeasonNames();

    // Persist the options object into the URL hash.
    window.location.hash = encodeURIComponent(serialize(options));

    fetchCrops();
    valueCrops();
    sortCrops();
}

/*
 * Called once on startup to draw the UI.
 */
function initial() {
    optionsLoad();
    updateData();
    renderGraph();
}

/*
 * Called on every option change to animate the graph.
 */
function refresh() {
    updateData();
    updateGraph();
}

/*
 * Parse out and validate the options from the URL hash.
 */
function optionsLoad() {
    if (!window.location.hash) return;

    options = deserialize(window.location.hash.slice(1));

    function validBoolean(q) {

        return q == 1;
    }

    function validIntRange(min, max, num) {

        return num < min ? min : num > max ? max : parseInt(num, 10);
    }

    options.season = validIntRange(0, 4, options.season);
    document.getElementById('select_season').value = options.season;

    options.produce = validIntRange(0, 2, options.produce);
    document.getElementById('select_produce').value = options.produce;

    options.planted = validIntRange(1, MAX_INT, options.planted);
    document.getElementById('number_planted').value = options.planted;

    options.maxSeedMoney = validIntRange(0, MAX_INT, options.maxSeedMoney);
    document.getElementById('max_seed_money').value = options.maxSeedMoney;

    options.average = validBoolean(options.average);
    document.getElementById('check_average').checked = options.average;
    options.costlessSeeds = validBoolean(options.costlessSeeds);
    document.getElementById('check_costless_seeds').checked = options.costlessSeeds;

    options.crossSeason = validBoolean(options.crossSeason);
    document.getElementById('cross_season').checked = options.crossSeason;

    var daysMax = 0;
    if (options.crossSeason)
        daysMax = options.season === 4 ? MAX_INT : 56;
    else
        daysMax = options.season === 4 ? MAX_INT : 28;

    options.days = validIntRange(1, daysMax, options.days);
    if (options.season === 4) {
        document.getElementById('number_days').value = options.days;
    } else {
        if (options.crossSeason) {
            document.getElementById('number_days').value = 56;
            document.getElementById('current_day').value = 57 - options.days;
        } else {
            document.getElementById('number_days').value = 28;
            document.getElementById('current_day').value = 29 - options.days;
        }
    }

    options.seeds.pierre = validBoolean(options.seeds.pierre);
    document.getElementById('check_seedsPierre').checked = options.seeds.pierre;

    options.seeds.joja = validBoolean(options.seeds.joja);
    document.getElementById('check_seedsJoja').checked = options.seeds.joja;

    options.seeds.special = validBoolean(options.seeds.special);
    document.getElementById('check_seedsSpecial').checked = options.seeds.special;

    options.buySeed = validBoolean(options.buySeed);
    document.getElementById('check_buySeed').checked = options.buySeed;

    options.fertilizer = validIntRange(0, 6, options.fertilizer);
    document.getElementById('select_fertilizer').value = options.fertilizer;

    options.fertilizerSource = validIntRange(0, 1, options.fertilizerSource);
    document.getElementById('speed_gro_source').value = options.fertilizerSource;

    options.buyFert = validBoolean(options.buyFert);
    document.getElementById('check_buyFert').checked = options.buyFert;

    options.level = validIntRange(0, 13, options.level);
    document.getElementById('farming_level').value = options.level;

    options.skills.till = validBoolean(options.skills.till);
    document.getElementById('check_skillsTill').checked = options.skills.till;

    options.skills.agri = validBoolean(options.skills.agri);
    options.skills.arti = validBoolean(options.skills.arti);
    const binaryFlags = options.skills.agri + options.skills.arti * 2;
    document.getElementById('select_skills').value = binaryFlags;

    options.foragingLevel = validIntRange(0, 13, options.foragingLevel);
    document.getElementById('foraging_level').value = options.foragingLevel;

    options.skills.gatherer = validBoolean(options.skills.gatherer);
    document.getElementById('check_skillsGatherer').checked = options.skills.gatherer;

    options.skills.botanist = validBoolean(options.skills.botanist);
    document.getElementById('check_skillsBotanist').checked = options.skills.botanist;

    options.foodIndex = validIntRange(0, 6, options.foodIndex);
    document.getElementById('select_food').value = options.foodIndex;

    options.extra = validBoolean(options.extra);
    document.getElementById('check_extra').checked = options.extra;

    updateSeasonNames();
}

function deserialize(str) {
    var json = `(${str})`
        .replace(/_/g, ' ')
        .replace(/-/g, ',')
        .replace(/\(/g, '{')
        .replace(/\)/g, '}')
        .replace(/([a-z]+)/gi, '"$1":')
        .replace(/"(true|false)":/gi, '$1');


    return JSON5.parse(json);
}

function serialize(obj) {

    return Object.keys(obj)
        .reduce((acc, key) => {
            return /^(?:true|false|\d+)$/i.test('' + obj[key])
                ? `${acc}-${key}_${obj[key]}`
                : `${acc}-${key}_(${serialize(obj[key])})`;
        }, '')
        .slice(1);
}

/*
 * Called when changing season/seeds, to redraw the graph.
 */
function rebuild() {
    gAxis.selectAll("*").remove();
    gProfit.selectAll("*").remove();
    gSeedLoss.selectAll("*").remove();
    gFertLoss.selectAll("*").remove();
    gIcons.selectAll("*").remove();
    gTooltips.selectAll("*").remove();

    updateData();
    barWidth = width / seasons[4].crops.length - barPadding;
    renderGraph();
}

document.addEventListener('DOMContentLoaded', initial);
document.addEventListener('click', function (event) {
    if (event.target.id === 'reset') window.location = 'index.html';
});
