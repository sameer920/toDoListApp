// Constants and requirements
const express = require('express');
const mongoose = require('mongoose');
const _ = require('lodash'); //underscore is due to lodash convention
const { readFileSync } = require('fs');

const date = require(__dirname + "/getDate.js")
const app = express();

//setting parameters
app.set('view engine', "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

//read database address
const dbAddress = readFileSync("dbAddress.txt", 'utf-8');

//database setup
mongoose.connect(dbAddress);

const itemsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Error: No name given. Can't add an item without specifying a name."]
    }
});

const listSchema = new mongoose.Schema({
    name: String,
    items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);
const Item = mongoose.model("Item", itemsSchema);

//default items to populate a new list.
const d1 = new Item({ name: "Welcome to your to-do list!" });
const d2 = new Item({ name: "Hit the + button to add a new item." });
const d3 = new Item({ name: "<-- Check these boxes to remove an item." });
const d4 = new Item({ name: "Create a seperate list by visiting a new page; entering list name after / in the address bar." });

const defaultItems = [d1, d2, d3, d4];


//SERVER LOGIC:

//This is just for deploying on heroku
let port = process.env.PORT;
if (port == null || port == "") {
    port = 1920;
}

app.listen(port, function() {
    console.log("Server's up at port " + port);
});

//------------------------------------------------------------Get Requests------------------------------------------------------------

app.get("/", function(req, res) {

    //show all the database items. It's important to have this INSIDE the get method to ensure new items appear
    //when they are added instead of when we restart the server, which is what happens when we keep this outside of the function.
    Item.find(function(err, foundItems) {
        if (err)
            console.log("There was an error: " + err);

        else {
            if (foundItems.length === 0) {
                Item.insertMany(defaultItems, function(err) {
                    if (err) {
                        console.log(err);
                    } else {
                        foundItems = defaultItems;
                    }
                })
            }
            let currentDay = date.getDate();
            res.render("lists", { listTitle: currentDay, items: foundItems });

        }
    });

});

app.get("/:listName", function(req, res) {

    //handle dynamic route using express
    listName = _.capitalize(req.params.listName);

    List.find({ name: listName }, function(err, itemsFound) {

        if (err) {
            //log any errors that occured.
            console.log(err);

        } else if (itemsFound.length !== 0) {

            //show the list found in the database
            res.render("lists", { listTitle: itemsFound[0].name, items: itemsFound[0].items });

        } else {

            //create a new list 
            const list = new List({
                name: listName,
                items: defaultItems
            });

            list.save();
            console.log("Created a new collection called " + listName);
            res.redirect("/" + listName);
        }
    });

});

//-----------------------------------------------------------Post Requests------------------------------------------------------------

app.post("/", function(req, res) {

    //create a new list item based on the user input
    const item = new Item({
        name: req.body.nItem
    });
    let listTitle = req.body.add;

    if (listTitle === date.getDate()) {
        //save the item directly as we are in the main list
        item.save();
        res.redirect("/");
    } else {
        //Save the item in a specific list.

        List.findOne({ name: listTitle }, function(err, result) {
            if (!err) {
                //find the list to push the item to
                if (result) {
                    //add the item in the items array of the specific list and update the document.
                    result.items.push(item);
                    result.save();
                    res.redirect("/" + listTitle);
                }
            } else {
                console.log(err);
            }
        })
    }
});

app.post("/delete", function(req, res) {
    let listName = req.body.listName;
    let id = req.body.checkbox;

    if (listName === date.getDate()) {
        //Deleting an item from the main to-do list.
        Item.deleteOne({ _id: id }, function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log("successfully deleted " + id);
            }
        })

        res.redirect("/");
    } else {
        //Deleting items from a specific list that is not the main list.

        //Model.findOneAndUpdate({conditions for documents to find},{updates},callback function) <-- syntax for function
        //Model.findOneAndUpdate({conditions for documents to find},{$pull : {Array to pull from: {item to pul from chosen array}}})
        //^further explanation of how the syntax for conditions work in findOneAndUpdate.

        //$pull is an array update operator from mongodb

        //The basic idea of this part is to find the list we are editing from the database and removing an item from it's items array
        //based on the id we have recieved from the checkbox being clicked.

        List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: id } } }, function(err, result) {
            if (!err) {
                res.redirect("/" + listName);
            } else {
                console.log(err);
            }
        })
    }

});