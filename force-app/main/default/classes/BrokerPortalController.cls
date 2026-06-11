global without sharing class  BrokerPortalController {
    
    public class PicklistOption {
        @AuraEnabled
        public String label { get; set; }
        @AuraEnabled
        public String value { get; set; }
        
        public PicklistOption(String label, String value) {
            this.label = label;
            this.value = value;
        }
    }
    
    @AuraEnabled
    public static String loginBrokerSite(String username, String password, String startUrl) {
        try {
            startUrl = '/broker/';
            System.debug('Login attempt with username: ' + username + ', startUrl: ' + startUrl + ' password: ' + password);
            ApexPages.PageReference lgn = Site.login(username, password, startUrl);
            
            if(lgn != null) return lgn.getUrl();
            throw new CalloutException();
        } catch (Exception ex) {
            System.debug('Login failed with exception: ' + ex.getMessage());
            return ex.getMessage();
        }
    }
    
    @AuraEnabled
    public static String forgotPassword(String username) {
        
            List<User> userList = [SELECT Id , UserName ,isActive, email FROM User WHERE userName =: username];
            if(userList.size()>0 && userList[0].isActive==true){
                Site.forgotPassword(username);
                ApexPages.PageReference checkEmailRef = new PageReference('/secur/logout.jsp');
                system.debug('checkEmailRef'+checkEmailRef);
                return null;
            }else if(userList.size()>0){
                return 'User is Inactive';
            }
                return Label.Site.invalid_email;
        
    }
   
    // Method to check if a record exists in a given object
    public static Boolean doesRecordExist(String fieldName, String value, String objectName) {
        if (String.isEmpty(value)) return false;
        system.debug(' fieldName ' + fieldName+ ' value ' + value+ ' objectName ' + objectName);
        system.debug(' SELECT ' + !Database.query('SELECT Id FROM ' + objectName + ' WHERE ' + fieldName + ' = :value LIMIT 1').isEmpty());
        return !Database.query('SELECT Id FROM ' + objectName + ' WHERE ' + fieldName + ' = :value LIMIT 1').isEmpty();
    }
    
    @AuraEnabled
    public static Boolean getTradeLicenseNumber(String tradeLicenseNumber) {
        return doesRecordExist('Trade_License_Number__c', tradeLicenseNumber, 'Account');
    }
    
    @AuraEnabled
    public static Boolean getLandlineNumber(String landline) {
        return doesRecordExist('Landline__c', landline, 'Account');
    }
    
    @AuraEnabled
    public static Boolean getAgencyEmail(String agencyEmailId) {
        return doesRecordExist('Agency_Email__c', agencyEmailId, 'Account');
    }
    
    // log-in portal user associated Contact and Account - The Contact record of the current user, or null if not found
    @AuraEnabled(cacheable=true)
    public static Contact getUserContact() {
        Id userId = UserInfo.getUserId();
        if (Test.isRunningTest()) {
                Contact con = [SELECT Id, AccountId, Account.Receive_Announcements_Updates__c, Account.OwnerId, Account.Agency_Executive__c, Account.Agency_Executive__r.Email, Account.Owner.Email, Contact_Type__c, FirstName, Lastname, Email, MobilePhone FROM Contact  LIMIT 1] ;
                return con;
        } else {
            User usData = [SELECT Id, ContactId FROM User WHERE Id = :userId AND IsActive = true LIMIT 1];
            return (usData.ContactId != null) 
                ? [SELECT Id, AccountId, Account.Receive_Announcements_Updates__c, Account.OwnerId, Account.Agency_Executive__c, Account.Agency_Executive__r.Email, Account.Owner.Email, Contact_Type__c, FirstName, Lastname, Email, MobilePhone FROM Contact WHERE Id = :usData.ContactId LIMIT 1] 
                : null;
        }
    }
    
    
    
    @AuraEnabled
    public static void updateUserProfile(String email, String mobile) {

        Id userId = UserInfo.getUserId();
        User usData = [SELECT Id, ContactId FROM User WHERE Id = :userId AND IsActive = true LIMIT 1];
        
        Contact conData = [SELECT Id, AccountId, Account.OwnerId, Contact_Type__c, FirstName, Lastname, Email,New_Email__c, MobilePhone,Email_Change_Time__c FROM Contact WHERE Id = :usData.ContactId LIMIT 1];
        
        if (email != null) {
            usData.Email = email;
            conData.Email_Change_Time__c = datetime.now();
            conData.New_Email__c = email;
            //conData.Email= email;
        }

        if (mobile != null) {
            usData.MobilePhone = mobile;
        }
        
        try {
            update usData;
            
            update conData;
            
            if (mobile != null) {
                conData.MobilePhone = mobile;
            }
            
            update conData;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to update profile: ' + e.getMessage());
        }
    }
        
    // Get all Sales Executive Profile Users
    @AuraEnabled(cacheable=true)
    public static List<PicklistOption> getSalesRepOptions() {
        
        List<PicklistOption> options = new List<PicklistOption>();
        for (User usr : [SELECT Id, Name, FirstName, LastName FROM User Where  profile.name like 'Agency Executive' And isActive=true LIMIT 2000 ]) {
            String fullName = String.isBlank(usr.FirstName) ? usr.LastName : usr.FirstName + ' ' + usr.LastName;
            options.add(new PicklistOption(fullName, usr.Id));
        }
        return options;
    }
    //Get Announcements/Updates
    @AuraEnabled(cacheable=true)
    public static List<Announcements_And_Updates__c> getAnnouncements() {
        Contact conData = getUserContact();
        
        if(conData.Account.Receive_Announcements_Updates__c==false){
            return [SELECT Name, Active__c,  Message__c, Type__c,Content_Url__c FROM Announcements_And_Updates__c WHERE Active__c = true AND (Type__c='Ora Policies and Procedure' OR Type__c='News')];
        } else {
            return [SELECT Name, Active__c,  Message__c, Type__c,Content_Url__c FROM Announcements_And_Updates__c WHERE Active__c = true];
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Broker_Notification__c> getBrokerNotifications() {
        Contact conData = getUserContact();
        if(conData.Contact_Type__c =='Admin'){
            return [
                SELECT Id, Message__c, IsActive__c, Type__c, Created_Days__c, IsRead__c 
                FROM Broker_Notification__c
                WHERE (Contact__c = :conData.Id OR Contact__c=null)  AND Broker_Account__c = :conData.AccountId
                ORDER BY CreatedDate DESC
            ];
        } else {
            return [
                SELECT Id, Message__c, IsActive__c, Type__c, Created_Days__c, IsRead__c 
                FROM Broker_Notification__c
                WHERE Contact__c = :conData.Id AND Broker_Account__c = :conData.AccountId
                ORDER BY CreatedDate DESC
            ];
        }
        
        
    }
    @AuraEnabled
    public static void markNotificationAsRead(Id notificationId) {
        Broker_Notification__c note = [SELECT Id, IsRead__c FROM Broker_Notification__c WHERE Id = :notificationId LIMIT 1];
        note.IsRead__c = 'Read';
        update note;
    }

    /*@AuraEnabled(cacheable=true)
    public static List<String> getMobileCountryOptions() {
        Schema.DescribeFieldResult fieldResult = Account.Agency_Contact_Country_Code__c.getDescribe();
        List<Schema.PicklistEntry> picklistEntries = fieldResult.getPicklistValues();
        List<String> codeOptions = new List<String>();
        for (Schema.PicklistEntry entry : picklistEntries) {
            codeOptions.add(entry.getValue());
        }
        return codeOptions;
    }*/
    @AuraEnabled(cacheable=true)
    public static List<PicklistOption> getMobileCountryOptions() {
        Schema.DescribeFieldResult fieldResult = Account.Agency_Contact_Country_Code__c.getDescribe();
        List<Schema.PicklistEntry> picklistEntries = fieldResult.getPicklistValues();
        
        List<PicklistOption> codeOptions = new List<PicklistOption>();
        for (Schema.PicklistEntry entry : picklistEntries) {
            codeOptions.add(new PicklistOption(entry.getLabel(), entry.getValue()));
        }
        return codeOptions;
    }



    
    // Get all Sales Executive Profile Users along with Account Owner
    @AuraEnabled(cacheable=true)
    public static List<PicklistOption> getOwnerwithSalesRepOptions() {
        List<PicklistOption> options = new List<PicklistOption>();
        
        Contact conData = getUserContact();
        
        if (conData != null && conData.AccountId != null) {
            Account account = [SELECT OwnerId, Owner.Name, Owner.FirstName, Owner.LastName, Owner.IsActive 
                               FROM Account  WHERE Id = :conData.AccountId ];
            
            if (account.Owner.IsActive) {
                String ownerFullName = String.isBlank(account.Owner.FirstName) ? account.Owner.LastName 
                    : account.Owner.FirstName + ' ' + account.Owner.LastName;
                
                // Add Account Owner to the top of the list
                options.add(new PicklistOption(ownerFullName, account.OwnerId));
            }
        }
        
        for (User usr : [SELECT Id, Name, FirstName, LastName FROM User Where  profile.name like 'Agency Executive' AND IsActive = true LIMIT 2000 ]) {
            String fullName = String.isBlank(usr.FirstName) ? usr.LastName : usr.FirstName + ' ' + usr.LastName;
            options.add(new PicklistOption(fullName, usr.Id));
        }
        return options;
    } 
    
    // Get all Sales Executive/Sale Director Profile Users
    @AuraEnabled(cacheable=true)
    public static List<PicklistOption> getSalesRepDirectorOptions() {
        
        List<PicklistOption> options = new List<PicklistOption>();
        for (User usr : [SELECT Id, Name, FirstName, LastName FROM User Where profile.name like '%Sales Director%' AND IsActive = true LIMIT 2000 ]) {
            String fullName = String.isBlank(usr.FirstName) ? usr.LastName : usr.FirstName + ' ' + usr.LastName;
            options.add(new PicklistOption(fullName, usr.Id));
        }
        // Adding the "Other" option manually
        options.add(new PicklistOption('Other', 'Other'));
        return options;
    }
    
    @AuraEnabled
    public static String createBrokerAccount(Map<String, Object> inputData){
        try {
            
            system.debug('agencyLocation ' + (String) inputData.get('agencyLocation'));
            
            system.debug(' String introducedByIds ==>' + (String) inputData.get('intorducedByIds')  );
            
            String introducedByIds = String.isNotBlank((String) inputData.get('intorducedByIds')) 
                ? (String) inputData.get('intorducedByIds') : null;
            
            String accOwner;            
            if (introducedByIds != null && introducedByIds != 'Other') {
                accOwner = introducedByIds;
            }
            
            system.debug(' accOwner ==>' + accOwner + ' introducedByIds ==>' + introducedByIds  );
            
            Id brokerRecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('Broker_Account').getRecordTypeId();
            
            // Create Account Record
            Account newAccount = new Account(
                Name = (String) inputData.get('brokerageAgencyName'),
                RecordTypeId = brokerRecordTypeId,
                Status__c = 'New/Request Submitted',
                Brokerage_Agency_location__c = (String) inputData.get('agencyLocation'),
                Broker_Office_Name__c = (String) inputData.get('brokerOfficeName'),
                Brokerage_Types__c = (String) inputData.get('brokerageTypes'),
                Trade_License_Name__c = (String) inputData.get('tradeLicenseName'),
                Trade_License_Number__c = (String) inputData.get('tradeLicenseNumber'),
                
                Tax_Registeration__c = (String) inputData.get('trnNumber'),
                
                Trade_License_Expiry_Date__c = String.isNotBlank((String) inputData.get('tradeLicenseExpiryDate')) 
                ? Date.valueOf((String) inputData.get('tradeLicenseExpiryDate')) : null,
                
                Agency_Email__c = (String) inputData.get('agencyEmailId'),
                Agency_Contact_Number__c =  (String) inputData.get('agencyContactNumber'),
                
                /*Ranking__c = String.isNotBlank((String) inputData.get('ranking')) 
                ? Decimal.valueof((String) inputData.get('ranking')) : null,
                
                Assigned_Internal_Sales_Person__c = String.isNotBlank((String) inputData.get('salesRepId')) 
                ? (String) inputData.get('salesRepId') : null, */
                
                Landline__c = (String) inputData.get('landline'),
                Website = (String) inputData.get('website'),
                
                POA_Expiry_date__c = String.isNotBlank((String) inputData.get('POAExpiryDate')) 
                ? Date.valueOf((String) inputData.get('POAExpiryDate')) : null,
                
                ORN_Number__c = (String) inputData.get('ornNumber'),
                ORN_Issuance_Date__c = String.isNotBlank((String) inputData.get('ornIssuanceDate')) 
                ? Date.valueOf((String) inputData.get('ornIssuanceDate')) : null,
                
                ORN_Expiry_Date__c = String.isNotBlank((String) inputData.get('ornExpiryDate')) 
                ? Date.valueOf((String) inputData.get('ornExpiryDate')) : null,
                
                ADM_Registration_Number__c = (String) inputData.get('admRegistrationNumber'),
                ADM_Issuance_Date__c = String.isNotBlank((String) inputData.get('admIssuanceDate')) 
                ? Date.valueOf((String) inputData.get('admIssuanceDate')) : null,
                
                ADM_Expiry_Date__c = String.isNotBlank((String) inputData.get('admExpiryDate')) 
                ? Date.valueOf((String) inputData.get('admExpiryDate')) : null,
                
                LinkedIn_Profile_Name__c =  (String) inputData.get('linkedInProfileName'),
                Instagram_Profile_Name__c = (String) inputData.get('instagramProfileName'),
                Facebook_Profile_Name__c =  (String) inputData.get('facebookProfileName'),
                Office_Number__c =  (String) inputData.get('officeNumber'),
                Building_Number__c = (String) inputData.get('buildingNumber'),
                Street_Name_Area_Name__c = (String) inputData.get('streetName'),
                Detailed_Registered_Address__c = (String) inputData.get('detailedRegisteredAddress'),
                PO_BOX__c =  (String) inputData.get('poBox'),
                Bank_Name__c = (String) inputData.get('bankName'),
                Bank_Branch__c = (String) inputData.get('bankBranch'),
                Bank_Account_Number__c = (String) inputData.get('accountNumber'),
                IBAN_Number__c =  (String) inputData.get('ibanNumber'),
                Swift_Code__c = (String) inputData.get('swiftCode'),
                Currency__c = (String) inputData.get('accountCurrency'),
                
                Agency_Contact_Country_Code__c = (String) inputData.get('agencyCountryCode'),
                Landline_Country_Code__c = (String) inputData.get('landlineCountryCode'),
                
                Agency_Executive__c = String.isNotBlank((String) inputData.get('agencyExecutiveId')) 
                ? (String) inputData.get('agencyExecutiveId') : null, 
                
                Signatory_Name__c =  (String) inputData.get('signatoryName'),
                Authorized_Delegate_person_Email__c = (String) inputData.get('ownerEmail')
            );
            
            if (accOwner != null) {
                newAccount.OwnerId = accOwner;
                newAccount.Exclude_from_Round_Robin__c = true;
            }
            
            insert newAccount;
            
            list<Contact> conlist = new list<Contact>();

            Contact newContact = new Contact(
                AccountId = newAccount.Id,
                Contact_Type__c = 'Admin',
                FirstName = (String) inputData.get('ownerFirstName'), 
                LastName = (String) inputData.get('ownerLastName'),
                Email = (String) inputData.get('ownerEmail'),
                MobilePhone = (String) inputData.get('ownerMobileNumber'),
                Status__c = 'Active',
                Owner_Mobile_Country_Code__c = (String) inputData.get('ownerMobileCountryCode'),
                Nationality__c = (String) inputData.get('nationality'),
                
                Designation__c =  (String) inputData.get('designation'),
                Passport_Expiry_Date__c  = String.isNotBlank((String) inputData.get('passportExpiryDate')) 
                ? Date.valueOf((String) inputData.get('passportExpiryDate')) 
                : null,
                Emirates_ID_Expiry_Date__c  = String.isNotBlank((String) inputData.get('emiratesIDExpiryDate')) 
                ? Date.valueOf((String) inputData.get('emiratesIDExpiryDate')) 
                : null
            );

            conlist.add(newContact);

            String managerLastName = (String) inputData.get('managerLastName');
            if (String.isNotBlank(managerLastName)) {
                Contact managerContact = new Contact(
                    AccountId = newAccount.Id,
                    Contact_Type__c = 'Admin',
                    FirstName = (String) inputData.get('managerFirstName'), 
                    LastName = (String) inputData.get('managerLastName'),
                    Email = (String) inputData.get('managerEmail'),
                    MobilePhone = (String) inputData.get('managerMobileNumber'),
                    Status__c = 'Active',
                    Owner_Mobile_Country_Code__c = (String) inputData.get('managerMobileCountryCode'),
                    Nationality__c = (String) inputData.get('managerNationality'),

                    Designation__c =  (String) inputData.get('managerDesignation'),
                    Passport_Expiry_Date__c  = String.isNotBlank((String) inputData.get('managerPassportExpiryDate')) 
                    ? Date.valueOf((String) inputData.get('managerPassportExpiryDate')) 
                    : null,
                    Emirates_ID_Expiry_Date__c  = String.isNotBlank((String) inputData.get('managerEmiratesIDExpiryDate')) 
                    ? Date.valueOf((String) inputData.get('managerEmiratesIDExpiryDate')) 
                    : null,
                    Signatory_Name__c = (String) inputData.get('managerSignatoryName'),
                    Is_Manager__c = true
                );


                conlist.add(managerContact);
            }

            insert conlist;
                                
            if (introducedByIds!=null) {
                Introduced_By__c introduced = new Introduced_By__c();
                introduced.Account__c = newAccount.Id;
                
                if (introducedByIds == 'Other'){
                    introduced.Other__c = 'Other';
                    introduced.Marketing_Channel_Name__c = (String) inputData.get('otherIntroducedBy');
                } else {
                    introduced.User__c = introducedByIds;
                }
                
                insert introduced; 
            }
            
            /*List<String> introducedByIds = new List<String>();
            
            if (inputData.containsKey('intorducedByIds') && inputData.get('intorducedByIds') != null) {
                for (Object id : (List<Object>) inputData.get('intorducedByIds')) {
                    introducedByIds.add((String) id);
                }
            }
                
            //Create Introduced_By__c Records for Each Introduced User
            List<Introduced_By__c> introducedByRecords = new List<Introduced_By__c>();
            
            if (!introducedByIds.isEmpty()) {
                for (String userId : introducedByIds) {
                    Introduced_By__c introduced = new Introduced_By__c();
                    introduced.Account__c = newAccount.Id;
                    if (userId == 'Other'){
                        introduced.Other__c = 'Other';
                        introduced.Marketing_Channel_Name__c = (String) inputData.get('otherIntroducedBy');
                    } else {
                        introduced.User__c = userId;
                    }
                    
                    introducedByRecords.add(introduced);
                }
                insert introducedByRecords; 
            }*/
            
            
            return newAccount.Id; 
            
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<LeadWrapper> getAllLeads() {
        Contact conData = getUserContact();
        
        List<LeadWrapper> leadWrapList = new List<LeadWrapper>();
        List<Lead> leadList = new List<Lead>();
        
        if (conData!=null){
            if(conData.Contact_Type__c =='Admin'){
                leadList = [SELECT Id, Unique_Identifier__c, FirstName, LastName, Email, Phone,MobilePhone, Status, Broker_Agent_Admin__c, Broker_Agent_Admin__r.Name, EOI_Status__c, EOI_Signed__c, Proof_of_Payment_Uploaded__c
                            FROM Lead WHERE Broker_Company__c =: conData.AccountId Order by CreatedDate desc ]; 
            } else if(conData.Contact_Type__c =='Agent'){
                leadList = [SELECT Id, Unique_Identifier__c, FirstName, LastName, Email, Phone,MobilePhone, Status, Broker_Agent_Admin__c, Broker_Agent_Admin__r.Name, EOI_Status__c, EOI_Signed__c, Proof_of_Payment_Uploaded__c
                            FROM Lead WHERE Broker_Agent_Admin__c =: conData.Id Order by CreatedDate desc]; 
            }
            
            for (Lead lead : leadList) {
                leadWrapList.add(new LeadWrapper(
                    lead.Id,
                    lead.Unique_Identifier__c,
                    lead.FirstName,
                    lead.LastName,
                    maskEmail(lead.Email),
                    maskMobile(lead.MobilePhone),
                    lead.Status,
                    lead.Broker_Agent_Admin__r != null ? lead.Broker_Agent_Admin__r.Name : '',
                    lead.EOI_Status__c,
                    lead.EOI_Signed__c==true ? true : false,
                    lead.Proof_of_Payment_Uploaded__c==true ? true : false
                ));
            }
        }
        
        return leadWrapList;   
    }
    
    @AuraEnabled
    public static string uploadEOIFiles(String base64, String filename, String recordId, String fileType) {
        Contact conData = getUserContact();
        
       
            cl_doccheck__Document_Checklist__c doc = new cl_doccheck__Document_Checklist__c();
            
            doc.Lead__c = recordId;
            doc.cl_doccheck__Type__c ='New Document';
                
            if (fileType == 'EOI'){
                doc.cl_doccheck__Sub_Type__c ='Signed EOI';
            } else if (fileType == 'POP'){
                doc.cl_doccheck__Sub_Type__c ='Proof Of Payment';
            }
            doc.cl_doccheck__Status__c = 'Uploaded';
            
            insert doc;
            
            if (fileType == 'EOI' || fileType == 'POP'){
                Lead ld =new lead();
                ld.Id = recordId;
                if (fileType == 'EOI'){
                    ld.EOI_Signed__c = true;
                } else if (fileType == 'POP'){
                    ld.Proof_of_Payment_Uploaded__c  = true;
                }
                
                
                update ld;
            }
            
            
            ContentVersion cv = new ContentVersion();
            cv.VersionData = EncodingUtil.base64Decode(base64);
            cv.Title = filename;
            cv.PathOnClient = filename;
            cv.FirstPublishLocationId = doc.Id;
            
            insert cv;
            
            return 'success';
            
        
    }
    
    @AuraEnabled
    public static String getEOISiteUrl(){
        Site siteRecord = [SELECT Id FROM Site WHERE Name = 'BrokerCommunityEOIDocument' LIMIT 1];
        SiteDetail siteDetailRecord = [SELECT Id, SecureUrl, DurableId FROM SiteDetail WHERE DurableId = :siteRecord.Id LIMIT 1];
        Return siteDetailRecord.SecureUrl;
    }
        
@AuraEnabled(cacheable=true)
public static List<Opportunity> getAllOpps() {
    Contact conData = getUserContact();
    if (conData == null) {
        return new List<Opportunity>();
    }

    List<Opportunity> oppList;

    if (conData.Contact_Type__c == 'Admin') {
        oppList = [
            SELECT Account.Name, Account.LastName, Account.FirstName,
                   Unique_Identifier__c, Name, StageName, Project__c,
                   Unit__c, Unit__r.Unit_Number__c, Unit__r.Name,
                   Listed_Purchase_Price__c, Booking_Date__c,
                   Broker_Account__c, Broker_Account__r.OwnerId,
                   Broker_Account__r.Owner.FirstName,
                   Broker_Account__r.Owner.LastName,
                   Broker_Agent_Admin__c,
                   Broker_Agent_Admin__r.FirstName,
                   Broker_Agent_Admin__r.LastName,
                   CreatedDate
            FROM Opportunity
            WHERE Broker_Account__c = :conData.AccountId
              AND StageName != 'Closed Lost'
              AND Unit__c != NULL
            ORDER BY CreatedDate ASC   
        ];
    } else if (conData.Contact_Type__c == 'Agent') {
        oppList = [
            SELECT Account.Name, Account.LastName, Account.FirstName,
                   Unique_Identifier__c, Name, StageName, Project__c,
                   Unit__c, Unit__r.Unit_Number__c, Unit__r.Name,
                   Listed_Purchase_Price__c, Booking_Date__c,
                   Broker_Account__c, Broker_Account__r.OwnerId,
                   Broker_Account__r.Owner.FirstName,
                   Broker_Account__r.Owner.LastName,
                   Broker_Agent_Admin__c,
                   Broker_Agent_Admin__r.FirstName,
                   Broker_Agent_Admin__r.LastName,
                   CreatedDate
            FROM Opportunity
            WHERE Broker_Agent_Admin__c = :conData.Id
              AND Broker_Account__c = :conData.AccountId
              AND StageName != 'Closed Lost'
              AND Unit__c != NULL
            ORDER BY CreatedDate ASC
        ];
    } else {
        return new List<Opportunity>();
    }

   
    Map<Id, Opportunity> unitToOppMap = new Map<Id, Opportunity>();
    for (Opportunity opp : oppList) {
        if (!unitToOppMap.containsKey(opp.Unit__c)) {
            unitToOppMap.put(opp.Unit__c, opp);
        }
    }

    // ✅ Step 2: Convert to list
    List<Opportunity> result = unitToOppMap.values();

    // ✅ Step 3: Sort FINAL result by CreatedDate DESC
    result.sort(new OpportunityCreatedDateDesc());

    return result;
}
    @AuraEnabled(cacheable=true)
    public static List<UserCommission__c > getCommissions() {
        // Get the current user's Contact record
        Contact conData = getUserContact();
        List<UserCommission__c> opportunities = new list<UserCommission__c>();
        
        if (conData != null ) {
            opportunities = [
                SELECT Id, Opportunity__r.Unique_Identifier__c, CommissionPercentage__c, Commission_Status__c, CommissionAmount__c, Opportunity_Owner__c, Unit_Number__c, Unit__r.Name,
                Opportunity__r.Broker_Agent_Admin__c, Opportunity__r.Broker_Agent_Admin__r.FirstName, Opportunity__r.Broker_Agent_Admin__r.LastName, PaymentStatus__c, BrokerAccount__r.Name
                FROM UserCommission__c 
                WHERE BrokerAccount__c  =: conData.AccountId and IsBroker__c = true
            ];
        }
        
        return opportunities ;
    }
    
    @AuraEnabled
    public static string uploadInvoice(String base64, String filename, String recordId) {
        Contact conData = getUserContact();
        
        try {
            ContentVersion cv = new ContentVersion();
            cv.VersionData = EncodingUtil.base64Decode(base64);
            cv.Title = filename;
            cv.PathOnClient = filename;
            cv.FirstPublishLocationId = recordId;
            
            insert cv;
            
            UserCommission__c oppt =[Select Id, Invoice_Uploaded__c from UserCommission__c Where Id =:recordId];
            oppt.Invoice_Uploaded__c = true;
            oppt.Commission_Status__c = 'Inv-Uploaded';
            
            if(conData.Account.Agency_Executive__r.Email!='' && conData.Account.Agency_Executive__r.Email!=null){
                oppt.Executive_Email__c = conData.Account.Agency_Executive__r.Email;
            //} else {
            //    oppt.Executive_Email__c = conData.Account.Owner.Email;
            }
            
            update oppt;
            
            return 'success';
            
        } catch (Exception ex) {
            System.debug('Login failed with exception: ' + ex.getMessage());
            return ex.getMessage();
        }
    }
    

    // Mask Email Id 
    private static String maskEmail(String email) {
        if (String.isEmpty(email) || !email.contains('@')) {
            return email;
        }
        
        Integer indexofatsign = email.indexOf('@');
        
        String visiblePart = email.substring(0, Math.min(2, indexofatsign)); // Take up to first 2 characters
        return visiblePart + '***' + email.substring(indexofatsign);
    }
    
    // Mask Mobile
    private static String maskMobile(String mobile) {
        if (String.isEmpty(mobile) || mobile.length() < 4) {
            return mobile;
        }
        return '****' + mobile.substring(mobile.length() - 4);
    }
    
    @AuraEnabled(cacheable=true)
    public static BrokerDetailWrapper getBrokerDetail() {
        Contact conData = getUserContact();
        BrokerDetailWrapper accWrapper = new BrokerDetailWrapper();
        
        if (conData != null && conData.AccountId != null) {
            accWrapper.brokerAccount = [SELECT Id, Name, Ranking__c, Agency_Email__c, Landline__c, Phone,
                   Detailed_Registered_Address__c, Office_Number__c, Building_Number__c, Street_Name_Area_Name__c,
                   Trade_License_Expiry_Date__c, Trade_License_Number__c, Bank_Name__c, Bank_Branch__c, Bank_Account_Number__c,
                   IBAN_Number__c, Swift_Code__c, Currency__c, 
                   Is_Passport_Expired__c, Is_Emirates_Id_Expired__c, Is_POA_Expired__c, Is_Trade_License_Expired__c,
                   Is_Rera_Expired__c, Is_ADM_Expired__c                      
                   FROM Account WHERE Id =: conData.AccountId Limit 1 ]; 
            
            
            accWrapper.documentLinks = [SELECT Id, Title__c, Document_URL__c
                                        FROM Account_Documents__c WHERE Account__c = :conData.AccountId];
            
            
        }
        
        return accWrapper;   
    }
    
    
    @AuraEnabled
    public static void updateBankDetails( String bankName, String bankBranch, String accountNumber, String iban, String swiftCode, String accountCurrency) {
        Contact conData = getUserContact();
        
        if (conData == null) {
            throw new AuraHandledException('User Contact not found.');
        }
        
        Account acc = [SELECT Id FROM Account WHERE Id = :conData.AccountId LIMIT 1];
        
        acc.Bank_Name__c = bankName;
        acc.Bank_Branch__c = bankBranch;
        acc.Bank_Account_Number__c = accountNumber;
        acc.IBAN_Number__c = iban;
        acc.Swift_Code__c = swiftCode;
        acc.Currency__c = accountCurrency;
        
        update acc;
    }
    
    
    @AuraEnabled
    public static List<Id> uploadBrokerRegistrationFile(List<Map<String, Object>> filesData, String recordId) {
        List<Id> fileIds = new List<Id>();
        List<ContentVersion> contentVersions = new List<ContentVersion>();
        
        try {
            for (Map<String, Object> file : filesData) {
                ContentVersion cv = new ContentVersion();
                cv.Title = (String) file.get('Title');
                cv.PathOnClient = (String) file.get('PathOnClient');
                
                String base64Data = (String) file.get('VersionData');
                
                cv.VersionData = EncodingUtil.base64Decode(base64Data);
                cv.FirstPublishLocationId = recordId;
                contentVersions.add(cv);
            }
            
            if (!contentVersions.isEmpty()) {
                insert contentVersions;
                for (ContentVersion cv : contentVersions) {
                    fileIds.add(cv.Id);
                }
            } else {
                throw new AuraHandledException('No files were processed.');
            }
            
            return fileIds;
        } catch (Exception e) {
            throw new AuraHandledException('Error uploading file: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static List<Id> uploadBrokerProfileFile(List<Map<String, Object>> filesData) {
        if (filesData == null || filesData.isEmpty()) {
            throw new AuraHandledException('No files to process.');
        }
        
        Contact conData = getUserContact();
        List<Id> fileIds = new List<Id>();
        List<ContentVersion> contentVersions = new List<ContentVersion>();
        List<Broker_Documents__c> brokerDocs = new List<Broker_Documents__c>();
        
        try {
            for (Map<String, Object> file : filesData) {
                if (file.get('Title') == null || file.get('VersionData') == null) {
                    continue;
                }
                
                Broker_Documents__c bd = new Broker_Documents__c();
                bd.Broker__c = conData.AccountId;
                bd.Document__c  = (String) file.get('Title');
                bd.Expire_date__c = file.containsKey('ExpiryDate') ? Date.valueOf((String) file.get('ExpiryDate')) : null;
                if(conData.Account.Agency_Executive__r.Email!='' && conData.Account.Agency_Executive__r.Email!=null){
                    bd.Agency_Executive_Owner__c = conData.Account.Agency_Executive__c;
                //} else {
                //    bd.Agency_Executive_Owner__c = conData.Account.OwnerId;
                }
                brokerDocs.add(bd);
            }
            
            if (!brokerDocs.isEmpty()) {
                insert brokerDocs;
            }
            
            Integer index = 0;
            for (Map<String, Object> file : filesData) {
                ContentVersion cv = new ContentVersion();
                cv.Title = (String) file.get('Title');
                cv.PathOnClient = (String) file.get('PathOnClient');
                cv.VersionData = EncodingUtil.base64Decode((String) file.get('VersionData'));
                cv.FirstPublishLocationId = brokerDocs[index].Id; 
                contentVersions.add(cv);
                index++;
            }
            
            if (!contentVersions.isEmpty()) {
                insert contentVersions;
                for (ContentVersion cv : contentVersions) {
                    fileIds.add(cv.Id);
                }
            }
            
            return fileIds;
        } catch (Exception e) {
            throw new AuraHandledException('Error uploading files: ' + e.getMessage());
        }
    }

    
    
    // Get all Broke Agent Contact
    @AuraEnabled(cacheable=true)
    public static List<PicklistOption> getBrokerAgentOptions() {
        List<PicklistOption> options = new List<PicklistOption>();
        
        Contact conData = getUserContact();
        if (conData!=null){
            
            List<Contact> contactList = new  List<Contact>();           
            if(conData.Contact_Type__c =='Admin'){
                contactList = [SELECT Id, Name, FirstName, LastName FROM Contact Where AccountId =:conData.AccountId And Status__c='Active' ]; 
            } else if(conData.Contact_Type__c =='Agent'){
                contactList = [SELECT Id, Name, FirstName, LastName FROM Contact Where Id =:conData.Id And Status__c='Active']; 
            }
            
            for (Contact con : contactList) {
                String fullName = String.isBlank(con.FirstName) ? con.LastName : con.FirstName + ' ' + con.LastName;
                options.add(new PicklistOption(fullName, con.Id));
            }
        }
        return options;
    }
    
    @AuraEnabled
    public static String createBrokerLead(Map<String, String> leadData) {
        Contact conData = getUserContact();
        if (conData == null) return 'User has no associated account';
        
        try {
            Lead newLead = new Lead();
            
            newLead.Status = 'New';
            newLead.Lead_Type__c ='Indirect';
            newLead.Lead_Source__c = 'Broker Leads';
            newLead.FirstName = leadData.get('firstName');
            newLead.LastName = leadData.get('lastName');
            //newLead.Mobile_Country__c = leadData.get('mobileCountry');
            newLead.Phone= leadData.get('phoneNumber');
            newLead.MobilePhone = leadData.get('phoneNumber');
            newLead.Email = leadData.get('emailId');
            newLead.Lead_Country__c = leadData.get('leadCountry');
            newLead.Nationality__c = leadData.get('nationality');
            newLead.Broker_Company__c = conData.AccountId;
            newLead.Broker_Agent_Admin__c = leadData.get('brokerAgent');
            newLead.OwnerId = leadData.get('salesAgent');
            newLead.Broker_Comments__c = leadData.get('comments');
            
            insert newLead;
            
            return 'success';
            
        } catch (Exception ex) {
            System.debug('Login failed with exception: ' + ex.getMessage());
            return ex.getMessage();
        }
        
    }
    
    @AuraEnabled
    public static String createBrokerContact(Map<String, Object> brokerData, String brokerCardFile) {
        
        Contact conData = getUserContact();
        if (conData == null) return 'User has no associated account';
        System.debug('DEBUG: brokerData => ' + brokerData);
        
        try {
            Contact brokerContact = new Contact();
            brokerContact.FirstName = (String) brokerData.get('brokerFirstName');
            brokerContact.LastName = (String) brokerData.get('brokerLastName');
            brokerContact.Email = (String) brokerData.get('brokerEmail');
            brokerContact.MobilePhone = (String) brokerData.get('brokerMobile');
            brokerContact.AccountId = conData.AccountId;
            brokerContact.OwnerId = conData.Account.OwnerId;
            
            brokerContact.Broker_Card_Number__c = (String) brokerData.get('brokerCardNumber');
            brokerContact.Broker_Card_Issuance_Date__c = Date.valueOf((String)brokerData.get('cardIssuanceDate'));
            brokerContact.Broker_Card_Expiry_Date__c = Date.valueOf((String)brokerData.get('cardExpiryDate'));
            brokerContact.Contact_Type__c = (String)brokerData.get('contactRole');
            brokerContact.Status__c = (String)brokerData.get('status');
            
            insert brokerContact;
            
            if(String.isNotBlank(brokerCardFile)) {
                List<FileDataWP> files = (List<FileDataWP>) JSON.deserialize(brokerCardFile, List<FileDataWP>.class);
                System.debug(files);
                
                List<ContentVersion> cvList = new List<ContentVersion>();
                for(FileDataWP file : files) {
                    ContentVersion cv = new ContentVersion();
                    cv.ContentLocation = 'S'; 
                    cv.VersionData = EncodingUtil.base64Decode(file.fileContent);
                    cv.Title = file.fileName;
                    cv.PathOnClient = file.fileName;
                    cv.FirstPublishLocationId = brokerContact.Id;
                    cvList.add(cv);
                }
                Insert cvList;      
            } else {
                return 'Broker not created';
            }
            
            return 'success';
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<String> getStatusPicklistOptions() {
        Schema.DescribeFieldResult fieldResult = Contact.Status__c.getDescribe();
        List<Schema.PicklistEntry> picklistEntries = fieldResult.getPicklistValues();
        List<String> statusOptions = new List<String>();
        for (Schema.PicklistEntry entry : picklistEntries) {
            statusOptions.add(entry.getValue());
        }
        return statusOptions;
    }
    
   
    @AuraEnabled(cacheable=true)
    public static List<AgentDetailsWrapper> getAllAgent() {
        Contact adminContact = getUserContact();
        if (adminContact == null || adminContact.Contact_Type__c != 'Admin') {
            throw new AuraHandledException('Access Denied');
        }
        
        // Get Opportunity sales count per agent
        Map<Id, Integer> opportunityCountMap = new Map<Id, Integer>();
        for (AggregateResult ar : [
            SELECT Broker_Agent_Admin__c agentId, COUNT(Id) oppCount
            FROM Opportunity
            WHERE Broker_Account__c =:adminContact.AccountId
            GROUP BY Broker_Agent_Admin__c
        ]) {
            opportunityCountMap.put((Id) ar.get('agentId'), (Integer) ar.get('oppCount'));
        }
        
        // Get total commission from Commission_Broker__c per agent
        Map<Id, Decimal> totalCommissionMap = new Map<Id, Decimal>();
        for (AggregateResult ar : [
            SELECT Opportunity__r.Broker_Agent_Admin__c agentId, SUM(CommissionAmount__c) totalCommission
            FROM UserCommission__c 
            WHERE BrokerAccount__c =:adminContact.AccountId
            GROUP BY Opportunity__r.Broker_Agent_Admin__c
        ]) {
            totalCommissionMap.put((Id) ar.get('agentId'), (Decimal) ar.get('totalCommission'));
        }
        
        // Fetch all agent contacts from this admin's account
        List<Contact> agents = [
            SELECT Id, Name, Email, MobilePhone, Status__c, Contact_Type__c
            FROM Contact 
            WHERE AccountId = :adminContact.AccountId
            ORDER BY Contact_Type__c
        ];
        
        // Combine all into wrapper
        List<AgentDetailsWrapper> result = new List<AgentDetailsWrapper>();
        for (Contact agent : agents) {
            Decimal totalCommission = totalCommissionMap.get(agent.Id);
            Integer oppCount = opportunityCountMap.get(agent.Id);
            result.add(new AgentDetailsWrapper(
                agent.Id,
                agent.Name,
                agent.Email,
                agent.MobilePhone,
                agent.Status__c,
                agent.Contact_Type__c,
                totalCommission != null ? totalCommission : 0,
                oppCount != null ? oppCount : 0
            ));
        }
        
        return result;
    }
    
    
    // Method to update the agent's status
    @AuraEnabled
    public static void updateAgentStatus(Id agentId, String newStatus) {
        Contact conData = getUserContact();
        if (conData != null){
            Contact agent = [SELECT Id, Status__c FROM Contact WHERE Id = :agentId LIMIT 1];
            if (agent == null) {
                throw new AuraHandledException('Agent not found.');
            }
            agent.Status__c = newStatus;
            
            try {
                update agent;
            } catch (Exception e) {
                throw new AuraHandledException('Error updating agent status: ' + e.getMessage());
            }
        } 
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Unit_Broker__c> getAllUnits() {
        list<Unit_Broker__c> unitsList = new list<Unit_Broker__c>();
        Contact conData = getUserContact();
        
        if (conData!=null){
            unitsList=[SELECT Id, Unit__r.Id, Unit__r.Name, Unit__r.Unit_Number__c, Unit__r.Unit_Typology__c,
                       Unit__r.Project_Name__c, Unit__r.Total_Sellable_Area__c,Unit__r.Selling_Price__c ,Unit__r.Maintenance_Fees__c,Unit__r.Club_Membership__c,Unit__r.Sales_Agent_User__c,Unit__r.Sales_Agent_User__r.LastName,Unit__r.Sales_Agent_User__r.FirstName,
                       Unit__r.Views__c, Unit__r.Finish_Type__c,Unit__r.Asset_Type__c,Unit__r.Floor_Number__c ,Unit__r.Phase_Name__c ,Unit__r.Cluster_Name__c ,Unit__r.Building_Name__c,Unit__r.Plot_Area__c,Unit__r.Garden_Area__c ,Unit__r.Outdoor_Area__c,Unit__r.Terrace_Area__c
                       FROM Unit_Broker__c
                       WHERE Broker__c = :conData.AccountId and Unit__r.Unit_Status__c='Available' and  Unit__r.Available_For_Broker__c=true 
                       and End_Date__c >= :System.today()];
        }
        return unitsList;
    }
    
  
    @AuraEnabled(cacheable=true)
    public static List<BrokerRequestWrapper> getBrokerRequests() {
        Contact conData = getUserContact();
        List<BrokerRequestWrapper> wrappedList = new List<BrokerRequestWrapper>();
        List<Broker_Request__c> request;
        
        if (conData.Contact_Type__c == 'Admin') {
            request = [SELECT Id, Name, Request_Type__c, Status__c, CreatedDate, Remarks__c, Broker_Agent_Admin__r.FirstName, Broker_Agent_Admin__r.LastName, Approval_Status__c, Content_Url__c  
                       FROM Broker_Request__c 
                       WHERE Broker_Account__c = :conData.AccountId
                       ORDER BY CreatedDate DESC];
        } else if (conData.Contact_Type__c == 'Agent') {
            request = [SELECT Id, Name, Request_Type__c, Status__c, CreatedDate, Remarks__c, Broker_Agent_Admin__r.FirstName, Broker_Agent_Admin__r.LastName, Approval_Status__c, Content_Url__c 
                       FROM Broker_Request__c 
                       WHERE Broker_Account__c = :conData.AccountId AND Broker_Agent_Admin__c = :conData.Id
                       ORDER BY CreatedDate DESC];
        }
        
        for (Broker_Request__c req : request) {
            BrokerRequestWrapper w = new BrokerRequestWrapper();
            w.Id = req.Id;
            w.Name = req.Name;
            w.RequestType = req.Request_Type__c;
            w.Status = req.Status__c;
            w.CreatedDate = req.CreatedDate;
            w.Remarks = req.Remarks__c;
            w.ContentUrl = req.Content_Url__c;
            w.AgentName = req.Broker_Agent_Admin__r.FirstName + ' ' + req.Broker_Agent_Admin__r.LastName;
            
            // Button Logic
            if (req.Request_Type__c == 'Request NOC' && req.Status__c == 'Closed' && String.isNotBlank(req.Content_Url__c)) {
                w.buttonLabel = 'Download NOC';
                w.buttonDisabled = false;
            } else if (req.Request_Type__c == 'Request to Marketing' && req.Status__c == 'In progress' && req.Approval_Status__c == 'Rejected') {
                w.buttonLabel = 'Resubmit';
                w.buttonDisabled = false;
            } else {
                w.buttonLabel = '';
                w.buttonDisabled = true;
            }
            
            wrappedList.add(w);
        }

        
        return wrappedList;
    }
    

    @AuraEnabled(cacheable=true)
    public static List<PicklistOption> getProjects() {
        List<PicklistOption> options = new List<PicklistOption>();
        Set<Id> projectIds = new Set<Id>();
        Contact conData = getUserContact();
        for (Unit_Broker__c unit : [SELECT Unit__r.Id, Unit__r.Name, Unit__r.Project__r.Id, Unit__r.Project__r.Name FROM Unit_Broker__c
                                    WHERE Broker__c = :conData.AccountId AND Unit__r.Unit_Status__c='Available' 
                                    AND  Unit__r.Available_For_Broker__c=true ORDER BY Unit__r.Project__r.Name ASC]) {

            Id projectId = unit.Unit__r.Project__r.Id;
            if (!projectIds.contains(projectId)) {
                projectIds.add(projectId);
                options.add(new PicklistOption(unit.Unit__r.Project__r.Name, projectId));
            }
                                        
          //options.add(new PicklistOption(unit.Unit__r.Project__r.Name, unit.Unit__r.Project__r.Id));                               
       }
        return options;
    }

    

    @AuraEnabled
    public static Broker_Request__c saveBrokerRequest(String requestData) {
        Contact conData = getUserContact();
        if (conData == null || conData.AccountId == null) {
            throw new AuraHandledException('Error: Unable to find associated Contact or Account.');
        }
        try{
            
            Map<String, Object> requestMap = (Map<String, Object>) JSON.deserializeUntyped(requestData);
            
            Broker_Request__c newRequest = new Broker_Request__c();
            //  Check if this is an update
            if (requestMap.containsKey('id') && String.isNotBlank((String)requestMap.get('id'))) {
                newRequest = [SELECT Id, Name, Request_Type__c, Status__c, CreatedDate, Remarks__c, Broker_Agent_Admin__r.FirstName, Broker_Agent_Admin__r.LastName, Approval_Status__c, Content_Url__c, Resubmitted_Request__c  
                              FROM Broker_Request__c WHERE Id = :((String)requestMap.get('id'))];
                
                newRequest.Resubmitted_Request__c = true;
            } else {
        
                newRequest.Broker_Account__c = conData.AccountId;
                newRequest.Broker_Agent_Admin__c = conData.Id;
                newRequest.Request_Type__c = (String) requestMap.get('requestType');
            }
            if(conData.Account.Agency_Executive__r.Email!='' && conData.Account.Agency_Executive__r.Email!=null){
                newRequest.Agency_Executive_Owner__c = conData.Account.Agency_Executive__r.Email;
            //} else {
            //    newRequest.Agency_Executive_Owner__c = conData.Account.Owner.Email;
            }
            
            newRequest.Remarks__c = (String) requestMap.get('remark');
            newRequest.NOC_Reason__c = (String) requestMap.get('nocReason');
            
            if (requestMap.containsKey('roadShowType') && requestMap.get('roadShowType') != null) {
                newRequest.Road_Show_Type__c = (String) requestMap.get('roadShowType');
            }
            
            if (requestMap.containsKey('selectedProjects') && requestMap.get('selectedProjects') != null && requestMap.get('selectedProjects') != '' ) {
                newRequest.Project__c = (String) requestMap.get('selectedProjects'); 
            }
            
            upsert newRequest;
            
            // Handle File Attachments
            List<String> uploadedFileIds = new List<String>();
            
            if (requestMap.containsKey('uploadedFiles') && requestMap.get('uploadedFiles') != null) {
                List<Object> fileList = (List<Object>) requestMap.get('uploadedFiles'); 
                
                for (Object file : fileList) {
                    uploadedFileIds.add(String.valueOf(file)); // Convert each entry to String
                }
            }
            
            if (!uploadedFileIds.isEmpty()) {
                List<ContentDocumentLink> fileLinks = new List<ContentDocumentLink>();
                
                for (String fileId : uploadedFileIds) {
                    fileLinks.add(new ContentDocumentLink(
                        LinkedEntityId = newRequest.Id,
                        ContentDocumentId = fileId,
                        ShareType = 'V' 
                    ));
                }
                
                insert fileLinks;
            }
            
            return newRequest;
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching Broker Requests: ' + e.getMessage());
        }
        
    }
    
    // This method is called from LWC to save multiple files
    @AuraEnabled
    public static String uploadAgreementDocuments(String accountId, String base64, String filename ) {
        
        try {
            list<ContentVersion> cvList = new list<ContentVersion>(); 
            
            if(filename!='' && filename!=null){
                ContentVersion cv = new ContentVersion();
                cv.VersionData = EncodingUtil.base64Decode(base64);
                cv.Title = filename;
                cv.PathOnClient = filename;
                cv.FirstPublishLocationId = accountId;
                cvList.add(cv);
            }
            
            If(cvList.size()>0){
                insert cvList;
                
                Account acc = new Account();
                acc.Id = accountId;
                acc.Documents_Signed__c = true;
                acc.Status__c ='Pending Management Signature';                
                update acc;
            }
            return 'success';
            
        } catch (Exception ex) {
            System.debug('exs=='+ex.getLineNumber()+'--'+ex.getMessage());
            return 'Error Occurred => '+ex.getMessage()+'==>'+ex.getLineNumber();
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static account getAgreementDetails(String recordID) {
        Account acc = new Account();
        acc = [SELECT Id , Agreement_Url__c   
               FROM Account WHERE id =: recordID ];
        
        return acc; 
    }
    
    @AuraEnabled
public static List<Map<String, String>> getCommissionValues() {
    Contact conData = getUserContact();
    List<UserCommission__c> commissions = new List<UserCommission__c>();
    List<Map<String, String>> commissionList = new List<Map<String, String>>();

    if (conData != null) {
        commissions = [
            SELECT Id, Opportunity__r.Unique_Identifier__c, 
                   Unit__r.Name, Unit_Number__c, 
                   Commission_Status__c, PaymentStatus__c
            FROM UserCommission__c
            WHERE BrokerAccount__c = :conData.AccountId 
                  AND Commission_Status__c NOT IN ('Inv-Approved', 'Inv-Rejected')
                  AND IsBroker__c = true
        ];
    }

    for (UserCommission__c uc : commissions) {
        String uid = uc.Opportunity__r.Unique_Identifier__c;
        String unitName = uc.Unit__r != null ? uc.Unit__r.Name : '';
        String unitNo = uc.Unit_Number__c != null ? String.valueOf(uc.Unit_Number__c) : '';

        String right = (String.isNotBlank(unitName) ? unitName : '') +
                       (String.isNotBlank(unitNo) ? ' (' + unitNo + ')' : '');
        String label = String.isNotBlank(right) ? (uid + ' — ' + right) : uid;

        commissionList.add(new Map<String, String>{
            'label' => label,
            'value' => uid
        });
    }

    return commissionList;
}




    /*@AuraEnabled 
    public static List<String> getCommissionValues(){
        Contact conData = getUserContact();
        List<UserCommission__c> opportunities = new list<UserCommission__c>();
        Set<String> commissionOptions = new Set<String>();
        
        if (conData != null ) {
            opportunities = [
                SELECT Id, Opportunity__r.Unique_Identifier__c, CommissionPercentage__c, Commission_Status__c, CommissionAmount__c, Unit_Number__c, Unit__r.Name,
                Opportunity__r.Broker_Agent_Admin__c, Opportunity__r.Broker_Agent_Admin__r.FirstName, Opportunity__r.Broker_Agent_Admin__r.LastName, PaymentStatus__c 
                FROM UserCommission__c 
                WHERE BrokerAccount__c  =: conData.AccountId AND Commission_Status__c !='Inv-Approved' AND Commission_Status__c !='Inv-Rejected' AND IsBroker__c = true
            ];
        }
        
        for (UserCommission__c comm : opportunities) {
            commissionOptions.add(comm.Opportunity__r.Unique_Identifier__c);
        }
        return new List<String>(commissionOptions);
        
    }*/

    @AuraEnabled
    public static void deleteFile(Id documentId) {
        try {
            ContentDocument doc ;
            doc =  [SELECT Id FROM ContentDocument WHERE Id = :documentId];
            delete doc;
        } catch (Exception e) {
            throw new AuraHandledException('Error deleting file: ' + e.getMessage());
        }
    }
    @AuraEnabled
    public static void updateFileName(Id documentId, String newFileName) {
        try {
            ContentVersion cv = new ContentVersion();
            
            cv = [SELECT Id, Title FROM ContentVersion WHERE ContentDocumentId = :documentId ORDER BY CreatedDate DESC LIMIT 1];
            cv.Title = newFileName;
            if(cv != null){
                update cv;
            }
            
        } catch (Exception e) {
            throw new AuraHandledException('Error Updating file: ' + e.getMessage());
        }
    }
    @AuraEnabled
    public static void createDocument(String fileName, List<String> commission, Id contentDocumentId){
        try{
            Contact conData = getUserContact();
            List<UserCommission__c> opportunities = new list<UserCommission__c>();
            opportunities = [
                SELECT Id, Opportunity__r.Unique_Identifier__c, CommissionPercentage__c, Commission_Status__c, CommissionAmount__c, 
                Opportunity__r.Broker_Agent_Admin__c, Opportunity__r.Broker_Agent_Admin__r.FirstName, Opportunity__r.Broker_Agent_Admin__r.LastName, PaymentStatus__c
                FROM UserCommission__c 
                WHERE BrokerAccount__c  =: conData.AccountId AND Opportunity__r.Unique_Identifier__c IN: commission AND IsBroker__c = true
            ];
            
            List<ContentDocumentLink> linksToInsert = new List<ContentDocumentLink>();
            List<UserCommission__c> opptList = new List<UserCommission__c>();
            for(UserCommission__c comm : opportunities){
                ContentDocumentLink link = new ContentDocumentLink();
                link.ContentDocumentId = contentDocumentId;
                link.LinkedEntityId = comm.Id;  
                link.ShareType = 'V';  
                link.Visibility = 'AllUsers';
                linksToInsert.add(link);
                
                UserCommission__c oppt = new UserCommission__c();
                oppt.Id = comm.Id;
                oppt.Invoice_Uploaded__c = true;
                oppt.Commission_Status__c = 'Inv-Uploaded';
            
                if(conData.Account.Agency_Executive__r.Email!='' && conData.Account.Agency_Executive__r.Email!=null){
                    oppt.Executive_Email__c = conData.Account.Agency_Executive__r.Email;
                //} else {
                //    oppt.Executive_Email__c = conData.Account.Owner.Email;
                }
                opptList.add(oppt);
                
            }
            
            insert linksToInsert;
            
            update opptList;
            
        } catch (Exception e) {
            throw new AuraHandledException('Error creating file: ' + e.getMessage()+' | Line: ' + e.getLineNumber());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<AggregateResult> getSalesSummary() {
        Contact conData = getUserContact();

        return [
            SELECT StageName stage, SUM(Listed_Purchase_Price__c) total
            FROM Opportunity
            WHERE Broker_Account__c = :conData.AccountId
            GROUP BY StageName
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Opportunity> getSalesDetails() {
        Contact conData = getUserContact();
        return [
            SELECT Id, Name, StageName, Account.Name, Project__c, Unit_Name__c,
                   Listed_Purchase_Price__c, Booking_Date__c, Broker_Account__r.Name, Broker_Agent_Admin__r.Name
            FROM Opportunity
            WHERE Broker_Account__c = :conData.AccountId
            ORDER BY StageName ASC, Booking_Date__c DESC
        ];
    }
    
    
    public class OpportunityCreatedDateDesc implements Comparator<Opportunity> {
    public Integer compare(Opportunity a, Opportunity b) {
        if (a.CreatedDate == b.CreatedDate) return 0;
        return a.CreatedDate > b.CreatedDate ? -1 : 1;
    }
}
    
    public class FileDataWP {
        public String fileName;
        public String fileContent;
    }
    
    public class BrokerDetailWrapper {
        @AuraEnabled public Account brokerAccount;
        @AuraEnabled public List<Account_Documents__c> documentLinks;
    }
    
    public class BrokerRequestWrapper {
        @AuraEnabled public String Id;
        @AuraEnabled public String Name;
        @AuraEnabled public String RequestType;
        @AuraEnabled public String Status;
        @AuraEnabled public DateTime CreatedDate;
        @AuraEnabled public String Remarks;
        @AuraEnabled public String AgentName;
        @AuraEnabled public String ContentUrl;
        @AuraEnabled public String buttonLabel;
        @AuraEnabled public Boolean buttonDisabled;
    }
    
    public class LeadWrapper {
        @AuraEnabled public String Id;
        @AuraEnabled public String LeadNumber;
        @AuraEnabled public String FirstName;
        @AuraEnabled public String LastName;
        @AuraEnabled public String MaskedEmail;
        @AuraEnabled public String MaskedMobile;
        @AuraEnabled public String Status;
        @AuraEnabled public String BrokerName;
        @AuraEnabled public String EOIStatus;
        @AuraEnabled public Boolean buttonEOIDisabled;
        @AuraEnabled public String UploadSignedEOILabel;
        @AuraEnabled public String UploadPOPLabel;
        @AuraEnabled public Boolean buttonDisabled;
        
        public LeadWrapper(String Id, String LeadNumber, String FirstName, String LastName, String MaskedEmail, String MaskedMobile, String Status, String BrokerName, String EOIStatus, Boolean buttonEOIDisabled, Boolean buttonDisabled) {
            this.Id = Id;
            this.LeadNumber = LeadNumber;
            this.FirstName = FirstName;
            this.LastName = LastName;
            this.MaskedEmail = MaskedEmail;
            this.MaskedMobile = MaskedMobile;
            this.Status = Status;
            this.BrokerName = BrokerName;
            this.EOIStatus = EOIStatus;
            this.buttonEOIDisabled = buttonEOIDisabled; 
            this.UploadSignedEOILabel = 'Upload Signed EOI';
            this.UploadPOPLabel = 'Upload POP';
            this.buttonDisabled = buttonDisabled; 
            
        }
    }
    
    public class AgentDetailsWrapper {
        @AuraEnabled public String Id;
        @AuraEnabled public String Name;
        @AuraEnabled public String Email;
        @AuraEnabled public String MobilePhone;
        @AuraEnabled public String Status;
        @AuraEnabled public String ContactType;
        @AuraEnabled public Decimal TotalCommission;
        @AuraEnabled public Integer NumberOfSales;
        
        public AgentDetailsWrapper(String id, String name, String email, String mobile, String status, String role, Decimal commission, Integer count) {
            this.Id = id;
            this.Name = name;
            this.Email = email;
            this.MobilePhone = mobile;
            this.Status = status;
            this.ContactType = role;
            this.TotalCommission = commission;
            this.NumberOfSales = count;
        }
    }
    
    
}