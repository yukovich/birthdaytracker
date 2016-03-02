//Sending reminders for yesterday's birthdays. Maybe server timezone is off? 
//have a schedule of reminders like in http://richsilv.github.io/meteor/scheduling-events-in-the-future-with-meteor/
//even without createdby field, will send to lisa

ContactList = new Mongo.Collection('contacts');
UserData = new Mongo.Collection('data');

if (Meteor.isClient) {
  
  

  Meteor.subscribe('contacts');
  Meteor.subscribe('userdata');

  Template.contacts.helpers({
    'contact': function(){
      return ContactList.find().fetch()
    },
    //makes the selected item stand out
    'selectedClass': function(){
      var contactId = this._id;
      var selectedContact = Session.get('selectedContact');
      if(contactId == selectedContact){
        return "selected"
      }
    },
    //helper that formats dates
    'formatDate': function(date){
      return moment(date).format('MM-DD-YYYY');
    },

    'plusOne': function(number){
      return number+1;
    }



  });

  

  Template.contacts.events({
    'click .contact':function(){
      
      //set the value of the "selectedArticle" session to the unique ID of the clicked article
      //the "this" in this context refers to the document clicked (see html file)
      var contactId = this._id;
      Session.set('selectedContact',contactId);
    },
     'click .remove':function(){
      var selectedContact= Session.get('selectedContact');
      Meteor.call('removeContactData',selectedContact);
    } 
    

  });
  
  Template.addContactForm.events({
    'submit form': function(event){
      event.preventDefault();
      var contactNameVar = event.target.contactName.value;
      var contactBirthdayVar = event.target.contactBirthday.value;
      Meteor.call('insertContactData',contactNameVar,contactBirthdayVar);
      
    }

  }); 

  Template.addContactForm.rendered=function() {
    $('#my-datepicker').datepicker();
  }

  Template.userData.events({
    'submit form':function(event){
      event.preventDefault();
      var telegramUsernameVar = event.target.dataTelegramUsername.value;
      Meteor.call('insertUserData',telegramUsernameVar);

    }
  })

}
if (Meteor.isServer) {


  
  Meteor.publish('contacts',function(){
    var currentUserId = this.userId;
    return ContactList.find({createdBy:currentUserId},{sort:{birthday:1}})
  });
  
  Meteor.publish('userdata',function(){
    var currentUserId = this.userId;
    return UserData.find({createdBy:currentUserId})
  });
  

  Meteor.methods({
    'insertContactData': function(contactNameVar,contactBirthdayVar){
      var currentUserId= Meteor.userId();
      ContactList.insert({
        name: contactNameVar,
        birthday: new Date(contactBirthdayVar),
        createdBy: currentUserId
      });
    },

    'removeContactData': function(selectedContact){
      ContactList.remove(selectedContact);
    },

    'insertUserData': function(telegramUsernameVar){
      var currentUserId = Meteor.userId();
      UserData.update(        

        {TelegramUsername:telegramUsernameVar},
        {$set:{
          createdBy:currentUserId

        }},
        {upsert:false}
        
      )      
    },

    'sendMessage':function(messageVar,chatIdVar){
      HTTP.call('GET','https://api.telegram.org/bot116538214:AAFXBlRjEe2G67TBCa78ctQy95E1XJONSBw/sendMessage?text='+messageVar+'&chat_id='+chatIdVar);

    },

    'findContactsWithBirthdayToday':function(){
      
      var today = new Date();

      contactsWithBirthdayToday = ContactList.aggregate([
        {
          $project: {
            name: 1,
            birthday:1,
            createdBy: 1,
            todayMonth:{"$month":today},
            todayDayOfMonth:{"$dayOfMonth":today},
            month:{"$month":"$birthday"},
            dayOfMonth:{"$dayOfMonth":"$birthday"}
            
          }
        }, 
        {
          $project: {
            name:1,
            birthday:1,
            createdBy: 1,
            monthDifference:{"$subtract":["$month","$todayMonth"]},
            dayOfMonthDifference:{"$subtract":["$dayOfMonth","$todayDayOfMonth"]}
          }
        },
        {
          $match:{
            monthDifference:0,
            //maybe cos all stored at midnight, so need -1 for them to match.
            dayOfMonthDifference:-1
          }
        }
        
      ]);
   
      return contactsWithBirthdayToday;
    },

    'findTelegramChatId':function(createdByVar){
      result = UserData.find({createdBy:createdByVar}).fetch();
      console.log(result);
      for(var user in result){
        var chatId = result[user].chatId;
        
        
      }
      
      
      return chatId;
        
    },

    

    'sendTelegramBirthdayReminder':function(){
        
        Meteor.call("findContactsWithBirthdayToday",function(error,result){
          if(error){
            console.log(error.reason)
          }else{
            
            for (var contact in contactsWithBirthdayToday) {
              var createdByVar = contactsWithBirthdayToday[contact].createdBy;

              var contactName = contactsWithBirthdayToday[contact].name;
              console.log(createdByVar);

              Meteor.call("findTelegramChatId",createdByVar,function(error,chatId){
                if(error){
                  console.log(error.reason)
                }else{
                  Meteor.call("sendMessage",contactName+" has a birthday today",chatId,function(error,result){
                      if(error){
                        console.log(error.reason);
                      }
                    });

                  console.log(chatId);
                }
              });
            }
            
          }
        })

        
    }
    
  });
  //using meteor-synced-cron
  //synced-cron uses later.js
  SyncedCron.add({
    name:'Send telegram birthday reminders for contacts that have the birthday today',
    schedule: function(parser){
      return parser.text('at 8:00am');
    },

    job: function(){
      console.log("testing");
      
      Meteor.call("sendTelegramBirthdayReminder",function(error,result){
        if(error){
          console.log(error.reason);
        }else{
          
        }
      })
  
    }
  });

  Meteor.startup(function(){
    SyncedCron.start();

         
     offset = 0;
     
     var poll = function(){

        
        //if I add a timeout at the end, it messes with the setInterval and gives a 409 Conflict error.
        var getUpdatesURL = "https://api.telegram.org/bot116538214:AAFXBlRjEe2G67TBCa78ctQy95E1XJONSBw/getUpdates?offset="+offset;

        //console.log(getUpdatesURL);
        
        var result = Meteor.http.call("GET",getUpdatesURL);
        console.log(result);
        parsePollResult(result);
      
    };


    var parsePollResult = function(result) {
      
      for(var key in result) {
          var value = result[key];
          
          for(var key in value["result"]){
                     

            var chatIdVar = value["result"][key].message.chat.id;
           
            
            Meteor.call("sendMessage","You have been registered",chatIdVar,function(error,result){
              if(error){
                console.log(error.reason);
              }
            });
            

            var userNameVar = value["result"][key].message.from.username;

            //upsert so that entries are not repeated
            UserData.update(
              {TelegramUsername: userNameVar},
              {$set:{chatId: chatIdVar}},
              {upsert:true}
              
              );
            offset = value["result"][key].update_id +1;
          }
      }
    };    
      //tried setInterval at 1000/2000, and for 3 polls it returned the same message. Guessing that Telegram needed some time to remove the message.
      var start=function(){
        poll();
        var interval = Meteor.setInterval(function(){
          poll();
        },3000);
      };    
  
      start(); 
      
  }); 
}
  
