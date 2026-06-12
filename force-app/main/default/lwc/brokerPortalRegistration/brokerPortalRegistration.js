import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import Account_OBJECT from '@salesforce/schema/Account';
import Contact_OBJECT from '@salesforce/schema/Contact';
import BrokerAgencyLocation from '@salesforce/schema/Account.Brokerage_Agency_location__c';
import BrokerTypes from '@salesforce/schema/Account.Brokerage_Types__c';
import CurrencyField from '@salesforce/schema/Account.Currency__c';
import getTradeLicenseNumber from '@salesforce/apex/BrokerPortalController.getTradeLicenseNumber';
import getLandlineNumber from '@salesforce/apex/BrokerPortalController.getLandlineNumber';
import getAgencyEmail from '@salesforce/apex/BrokerPortalController.getAgencyEmail';
import getSalesRepOptions from '@salesforce/apex/BrokerPortalController.getSalesRepOptions';
import getSalesRepDirectorOptions from '@salesforce/apex/BrokerPortalController.getSalesRepDirectorOptions';
import createBrokerAccount from '@salesforce/apex/BrokerPortalController.createBrokerAccount';
import uploadContentVersion from '@salesforce/apex/BrokerPortalController.uploadBrokerRegistrationFile';
import getMobileCountryOptions from '@salesforce/apex/BrokerPortalController.getMobileCountryOptions';
import Nationality from '@salesforce/schema/Contact.Nationality__c';

export default class BrokerPortalRegistration extends NavigationMixin(LightningElement) {

    @api logoImageContentId;

    @api disclaimer;
    @track isdisclaimerChecked = false;
    @track disclaimerText = 'The submission of the information in this form does not constitute an agreement or commitment by ORA (“us” or “we”) in any way. By submitting the information in this form, you confirm that you are not entitled to, and should not, use or utilize the name of ORA, ORA Q, or any of their respective affiliates, officers, or directors in any manner whatsoever. Additionally, you are not permitted to carry out any real estate or real estate marketing activities on our behalf. By submitting this form, you also confirm that all information provided is true, accurate, and complete.';

    @track formData = {
        agencyLocation : '',
        brokerageAgencyName : '',
        brokerOfficeName : '',
        brokerageTypes : '',
        tradeLicenseName : '',
        tradeLicenseNumber : '',
        tradeLicenseExpiryDate : '',
        agencyEmailId : '',
        agencyContactNumber : '',
        trnNumber : '',
        salesRepId : '',
        landline: '',
        website : '',
        POAExpiryDate : '',
        ornNumber : '',
        ornIssuanceDate : '',
        ornExpiryDate : '',
        admRegistrationNumber : '',
        admIssuanceDate : '',
        admExpiryDate : '',
        linkedInProfileName : '',
        instagramProfileName : '',
        facebookProfileName : '',
        officeNumber : '',
        buildingNumber : '',
        streetName : '',
        detailedRegisteredAddress : '',
        poBox : '',
        bankName : '',
        bankBranch : '',
        accountNumber : '',
        ibanNumber: '',
        swiftCode : '',
        accountCurrency : '',
        intorducedByIds : '',
        //intorducedByIds : [],
        agencyExecutiveId : '',
        ownerFirstName : '',
        ownerLastName : '',
        ownerEmail : '',
        ownerMobileNumber : '',
        designation : '',
        passportExpiryDate : '',
        emiratesIDExpiryDate : '',
        signatoryName : '',
        otherIntroducedBy : '',
        agencyCountryCode : '',
        landlineCountryCode : '',
        ownerMobileCountryCode : '',
        nationality : '',
        managerFirstName: '',
        managerLastName: '',
        managerEmail: '',
        managerMobileNumber: '',
        managerMobileCountryCode: '',
        managerDesignation: '',
        managerPassportExpiryDate: '',
        managerEmiratesIDExpiryDate: '',
        managerNationality: '',
        managerSignatoryName: ''
    }
        
    selectedMultiFiles = [];

    salesRepOptions = [];
    salesRepDirectorOptions = [];
    countryCodeOptions = [];
    checkTradeLNumber = false;
    checkLandlineNumber = false;
    checkAgencyEmail = false;
    checkRequetsSubmitted = false;

    showError = false;
    errorDupliTradeMessage = '';
    errorMessage = '';
   
    @track checktradeLicenseCopy = false;
    errortradeLicenseCopy = false;
    errortradeLicenseCopyDoc = '';

    checkPOACopy = false;
    errorPOACopy = false;
    errorPOACopyDoc = '';

    checkmemorandumCopy = false;
    errormemorandumCopy = false;
    errormemorandumCopyDoc = '';
    
    checkreraCertificate = false;
    errorreraCertificate = false;
    errorreraCertificateDoc = '';

    checktaxRegistrationCopy = false;
    errortaxRegistrationCopy = false;
    errortaxRegistrationCopyDoc = '';

    checkvatCertificate = false;
    errorvatCertificate = false;
    errorvatCertificateDoc = '';

    checkpassportCopy = false;
    errorpassportCopy = false;
    errorpassportCopyDoc = '';

    checkamlPolicy = false;
    erroramlPolicy = false;
    erroramlPolicyDoc = '';

    checkemiratesIDCopy = false;
    erroremiratesIDCopy = false;
    erroremiratesIDCopyDoc = '';

    checkvisaCopy = false;
    errorvisaCopy = false;
    errorvisaCopyDoc = '';

    checkmanagerPassportCopy = false;
    errormanagerPassportCopy = false;
    errormanagerPassportCopyDoc = '';

    checkmanagerEmiratesIDCopy = false;
    errormanagerEmiratesIDCopy = false;
    errormanagerEmiratesIDCopyDoc = '';

    checkmanagerVisaCopy = false;
    errormanagerVisaCopy = false;
    errormanagerVisaCopyDoc = '';

    @track managers = [];
    @track personnel = [];

    personTypeOptions = [
        { label: 'Directors/Managers', value: 'Directors/Managers' },
        { label: 'Authorized signatories', value: 'Authorized signatories' },
        { label: 'Ultimate beneficial owners (UBOs) holding ≥25% ownership or control', value: 'UBO' }
    ];

    allowedFileTypes = '.png, .jpg, .jpeg, .pdf';       // Allowed file extensions
    allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];

    dubaiLocation = false;
    abudhabiLocation = false;
    internationLocation = false;

    showSuccessPage = false;
    Spinner = false;
    today;

    allNationalityOptions;


    @wire(getObjectInfo, { objectApiName: Account_OBJECT })
    AccountInfo;

    @wire(getObjectInfo, { objectApiName: Contact_OBJECT })
    ContactInfo;

    @wire(getPicklistValues, {
        recordTypeId: '$AccountInfo.data.defaultRecordTypeId',
        fieldApiName: BrokerAgencyLocation
    })
    wiredAgencyLocationValues({ error, data }) {
        if (data) {
            this.allAgencyLocationOptions = data.values; // Keep full list for filtering
            this.setAgencyLocationOptions(); // Apply default filter on load
        } else if (error) {
            console.error('Error loading Brokerage Agency Location picklist:', error);
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$ContactInfo.data.defaultRecordTypeId',
        fieldApiName: Nationality
    })
    wiredNationalityValues({ error, data }) {
        if (data) {
            this.allNationalityOptions = data.values; // Keep full list for filtering
        } else if (error) {
            console.error('Error loading Nationality picklist:', error);
        }
    }

    

    setAgencyLocationOptions() {
    if (!this.allAgencyLocationOptions) return;

    if (this.formData.brokerageTypes === 'International') {
        this.filteredAgencyLocationOptions = this.allAgencyLocationOptions.filter(
            opt => opt.value === 'International Agency'
        );
        this.formData.agencyLocation = 'International Agency';
        this.internationLocation = true;

        this.dubaiLocation = false;
        this.abudhabiLocation = false;

    } else if (this.formData.brokerageTypes === 'Domestic/Local') {
        this.internationLocation = false;
        this.filteredAgencyLocationOptions = this.allAgencyLocationOptions.filter(
            opt => opt.value === 'Dubai' || opt.value === 'Abu Dhabi' || opt.value === 'Sharjah' || opt.value === 'Ajman' 
            || opt.value === 'Ras Al-khaimah' || opt.value === 'Umm Al Quwain' || opt.value === 'Fujairah' 
        );

        // Clear invalid selection if previously set
        if (this.formData.agencyLocation === 'International Agency') {
            this.formData.agencyLocation = '';
        }
    } else {
        // Default: show all
        this.filteredAgencyLocationOptions = this.allAgencyLocationOptions;
    }

}



    @wire(getPicklistValues,
        {
            recordTypeId: '$AccountInfo.data.defaultRecordTypeId',
            fieldApiName: BrokerTypes
        }
    )
    BrokerTypesValues;

    @wire(getPicklistValues,
        {
            recordTypeId: '$AccountInfo.data.defaultRecordTypeId',
            fieldApiName: CurrencyField
        }
    )
    CurrencyValues;

    @wire(getSalesRepOptions)
    wiredSalesRep({ error, data }) {
        if (data) {
            console.log('OUTPUT getSalesRepOptions ==> ' , data);
            this.salesRepOptions = data; 
        } else if (error) {
            console.error('OUTPUT Error fetching getSalesRepOptions: ', error);
        }
    }

    @wire(getSalesRepDirectorOptions)
    wiredSalesRepDirector({ error, data }) {
        if (data) {
            console.log('OUTPUT getSalesRepDirectorOptions ==> ' , data);
            this.salesRepDirectorOptions = data; 
        } else if (error) {
            console.error('OUTPUT Error fetching getSalesRepDirectorOptions: ', error);
        }
    }

    /*@wire(getMobileCountryOptions)
    wiredCountryCode({ data, error }) {
        if (data) {
            this.countryCodeOptions = data.map(code => ({
                label: code,
                value: code
            }));
            console.log('OUTPUT wiredCountryCode ==> ', this.countryCodeOptions);
        } else if (error) {
            console.error('Error loading country codes', error);
        }
    }*/
    @wire(getMobileCountryOptions)
    wiredCountryCode({ data, error }) {
        if (data) {
            this.countryCodeOptions = data; // Already in { label, value } format
            console.log('OUTPUT wiredCountryCode ==> ', this.countryCodeOptions);
        } else if (error) {
            console.error('Error loading country codes', error);
        }
    }

    


    connectedCallback() {
        this.showError = false;
        this.Spinner = false;
        this.showSuccessPage = false;
        this.today = new Date().toISOString().slice(0,10);

        Promise.resolve().then(() => {
            if (this.disclaimer) {
                this.disclaimerText = this.disclaimer;
            }
        });

        console.log("OUTPUT disclaimer: ", this.disclaimer);
    }

    // Check for trade license already in existing broker account
    handleCheckLicenseNumber(){
        getTradeLicenseNumber({tradeLicenseNumber : this.formData.tradeLicenseNumber})
        .then((result) => {
            console.log('OUTPUT handleCheckLicenseNumber : ', result);
            this.checkTradeLNumber = result;
            if(this.checkTradeLNumber==true){
                this.errorMessage = 'Registration cannot be completed as Trade License Number is already registered.';
                this.errorDupliTradeMessage = 'Trade License Number is already registered.';
                this.showError = true;
                
            }
        }).catch((err) => {
            console.log('OUTPUT Error :' + err);
        });
    }
    
    // Check for Landline Number already in existing broker account
    handleLandlineNumber(){
        getLandlineNumber({landline : this.formData.landline})
        .then((result) => {
            console.log('OUTPUT handleLandlineNumber : ', result);
            this.checkLandlineNumber = result;
            if(this.checkLandlineNumber==true){
                this.errorMessage = 'Registration cannot be completed as Landline is already registered.';
                this.showError = true;
            }
        }).catch((err) => {
            console.log('OUTPUT Error :' + err);
        });
    }

    // Check for agencyEmail already in existing broker account
    handleAgencyEmail(){
        getAgencyEmail({agencyEmailId : this.formData.agencyEmailId})
        .then((result) => {
            console.log('OUTPUT handleAgencyEmail : ', result);
            this.checkAgencyEmail = result;
            if(this.checkAgencyEmail==true){
                this.errorMessage = 'Registration cannot be completed as Agency Email is already registered.';
                this.showError = true;
                
            }
        }).catch((err) => {
            console.log('OUTPUT Error :' + err);
        });
    }


    handleInputChange(event) {
        console.log('OUTPUT field : ' , event.target.dataset.id + ' value : ' , event.target.value);
        const field = event.target.dataset.id; 
        const value = event.target.value;

        this.formData = { ...this.formData, [field]: value };

        // Handle Brokerage Type logic
        if (field === 'brokerageTypes') {
            this.formData.brokerageTypes = value;
            this.setAgencyLocationOptions(); // re-filter options
            return;
        }

        
        if (field === 'intorducedByIds') {
            // Check if "Other" is selected on Introduced by
            if (value.includes('Other')) {
                this.showOtherInput = true;
            } else {
                this.showOtherInput = false;
                this.formData.otherIntroducedBy = ''; 
            }
        }

        // disclaimer
        if (field === 'disclaimer') {
            this.isdisclaimerChecked = event.target.checked;
        }

        // Agency Location 
        if (field === 'agencyLocation') {
            this.dubaiLocation = (value === 'Dubai');
            this.abudhabiLocation = (value === 'Abu Dhabi');
            this.internationLocation = (value === 'International Agency');
            return;
        }

        if (['ownerFirstName', 'ownerLastName', 'ownerEmail', 'ownerMobileCountryCode', 'ownerMobileNumber', 'designation', 'nationality', 'passportExpiryDate', 'emiratesIDExpiryDate'].includes(field)) {
            this.refreshSameAsCopies();
            this.updatePersonnelSameAsOptions();
        }
        
        // Check License Number
        if (field === 'tradeLicenseNumber') {
            this.checkTradeLNumber = false;
            if (value !== '') {
                this.showError = false;
                this.handleCheckLicenseNumber();
            }
            return;
        }

         // Check Landline 
         if (field === 'landline') {
            this.checkLandlineNumber = false;
            if (value !== '') {
                this.showError = false;
                this.handleLandlineNumber();
            }
            return;
        }

         // Check Agency Email
         if (field === 'agencyEmailId') {
            this.checkAgencyEmail = false;
            if (value !== '') {
                this.showError = false;
                this.handleAgencyEmail();
            }
            return;
        }
    }

    handleFileUpload(event) {
       const maxSize = 5 * 1024 * 1024; // 5 MB in bytes
        const field = event.target.dataset.id; 
    
        if (!event.target.files || event.target.files.length === 0) return; 
    
        // Convert FileList to an array 
        const files = Array.from(event.target.files);
        let newFiles = [];
    
        files.forEach((file, index) => {
            const fileExtension = file.name.split('.').pop().toLowerCase();
    
            // validation for file type and size
            if (!this.allowedExtensions.includes(fileExtension)) {
                this.setFileError(field, `Invalid file type. Allowed: ${this.allowedFileTypes}`);
                event.target.value = ''; // Clear input
                return;
            } 
            
            if (file.size > maxSize) {
                this.setFileError(field, 'File too large. Max size allowed is 5MB.');
                event.target.value = ''; // Clear input
                return;
            }
            
            // Filename based on the field
            let baseFileName = this.getFileName(field, fileExtension); 
            let uniqueSuffix = `${new Date().getTime()}_${index}`; // Unique ID for duplicates
            let filename = `${baseFileName}_${uniqueSuffix}.${fileExtension}`;
    
            // no duplicate filenames are added
            if (!newFiles.some(f => f.filename === filename) && 
                !this.selectedMultiFiles.some(f => f.key === field && f.filename === filename)) {
                newFiles.push({
                    key: field, // field key for validation reference
                    filename: filename, 
                    fileContent: file // Store file object instead of Base64
                });

                // Success Message - file uploaded
                this.setFileSuccess(field);
            }

        });
    
        // Merge newfiles while keeping existing ones, without duplicates
        this.selectedMultiFiles = [
            ...this.selectedMultiFiles.filter(f => f.key !== field), // Remove previous files of this type
            ...newFiles // Add only new files
        ];
    
        console.log(`OUTPUT Expected ${files.length} files, stored: ${this.selectedMultiFiles.length}`);
        console.log('OUTPUT Final selectedMultiFiles:', JSON.stringify(this.selectedMultiFiles));
    }

    handlePersonnelChange(event) {
        const personId = event.target.dataset.id;
        const field = event.target.dataset.field;
        const value = event.target.value;
        if (!personId || !field) {
            return;
        }

        const personIndex = this.personnel.findIndex(person => person.id === personId);
        if (personIndex < 0) {
            return;
        }

        const person = { ...this.personnel[personIndex], [field]: value };

        if (field === 'sameAsPerson') {
            if (!value) {
                person.isSameAs = false;
            } else {
                const source = this.getPersonnelSourceById(value);
                if (source) {
                    Object.assign(person, this.getSameAsValues(source));
                    person.isSameAs = true;
                }
            }
        }

        const updated = [...this.personnel];
        updated[personIndex] = person;
        this.personnel = updated;
        this.refreshSameAsCopies();
        this.updatePersonnelSameAsOptions();
    }

    handlePersonnelFileUpload(event) {
        const personId = event.target.dataset.personid;
        const field = event.target.dataset.field;
        if (!personId || !field || !event.target.files.length) {
            return;
        }

        const personIndex = this.personnel.findIndex(person => person.id === personId);
        if (personIndex < 0) {
            return;
        }

        const file = event.target.files[0];
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const maxSize = 5 * 1024 * 1024;

        if (!this.allowedExtensions.includes(fileExtension)) {
            event.target.value = '';
            return;
        }

        if (file.size > maxSize) {
            event.target.value = '';
            return;
        }

        const baseFileName = this.getFileName(field, fileExtension);
        const uniqueSuffix = `${Date.now()}_${personId}`;
        const filename = `${baseFileName}_${uniqueSuffix}.${fileExtension}`;

        const updatedPerson = {
            ...this.personnel[personIndex],
            [field]: {
                filename,
                fileContent: file
            }
        };

        const updated = [...this.personnel];
        updated[personIndex] = updatedPerson;
        this.personnel = updated;

        const fileKey = `${personId}-${field}`;
        this.selectedMultiFiles = [
            ...this.selectedMultiFiles.filter(f => f.key !== fileKey),
            {
                key: fileKey,
                filename,
                fileContent: file
            }
        ];
    }

    buildInputData() {
        return {
            ...this.formData,
            personnel: this.personnel.map(person => ({
                id: person.id,
                personType: person.personType,
                sameAsPerson: person.sameAsPerson,
                firstName: person.firstName,
                lastName: person.lastName,
                email: person.email,
                mobileCountryCode: person.mobileCountryCode,
                mobileNumber: person.mobileNumber,
                designation: person.designation,
                nationality: person.nationality,
                passportExpiryDate: person.passportExpiryDate,
                emiratesIDExpiryDate: person.emiratesIDExpiryDate
            }))
        };
    }

    validatePersonnelEntries() {
        for (let person of this.personnel) {
            if (!person.personType || person.personType.trim() === '') {
                return 'All Person Type fields are required. Click on "Add New Company Personnel" to add more person types.';
            }
            if (!person.firstName || !person.lastName) {
                return 'Please enter first name and last name for all added personnel.';
            }
            if (!person.email && !person.mobileNumber) {
                return 'Please provide email or mobile number for all added personnel.';
            }
        }
        return null;
    }

    handleAddPersonnel() {
        const newPerson = {
            id: `person-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            personType: '',
            sameAsPerson: '',
            sameAsOptions: [],
            isSameAs: false,
            firstName: '',
            lastName: '',
            email: '',
            mobileCountryCode: '',
            mobileNumber: '',
            designation: '',
            nationality: '',
            passportExpiryDate: '',
            emiratesIDExpiryDate: '',
            passportCopy: null,
            emiratesIDCopy: null,
            visaCopy: null
            ,amlPolicy: null
        };
        this.personnel = [...this.personnel, newPerson];
        this.updatePersonnelSameAsOptions();
    }

    handleRemovePersonnel(event) {
        const personId = event.target.dataset.id;
        if (!personId) {
            return;
        }

        this.personnel = this.personnel
            .filter(person => person.id !== personId)
            .map(person => {
                if (person.sameAsPerson === personId) {
                    return { ...person, sameAsPerson: '', isSameAs: false };
                }
                return person;
            });

        this.updatePersonnelSameAsOptions();
    }

    getPersonnelSourceById(id) {
        if (id === 'owner') {
            if (!this.formData.ownerFirstName && !this.formData.ownerLastName) {
                return null;
            }
            return {
                firstName: this.formData.ownerFirstName,
                lastName: this.formData.ownerLastName,
                email: this.formData.ownerEmail,
                mobileCountryCode: this.formData.ownerMobileCountryCode,
                mobileNumber: this.formData.ownerMobileNumber,
                designation: this.formData.designation,
                nationality: this.formData.nationality,
                passportExpiryDate: this.formData.passportExpiryDate,
                emiratesIDExpiryDate: this.formData.emiratesIDExpiryDate
            };
        }
        return this.personnel.find(person => person.id === id) || null;
    }

    getSameAsValues(source) {
        return {
            firstName: source.firstName || '',
            lastName: source.lastName || '',
            email: source.email || '',
            mobileCountryCode: source.mobileCountryCode || '',
            mobileNumber: source.mobileNumber || '',
            designation: source.designation || '',
            nationality: source.nationality || '',
            passportExpiryDate: source.passportExpiryDate || '',
            emiratesIDExpiryDate: source.emiratesIDExpiryDate || ''
        };
    }

    updatePersonnelSameAsOptions() {
        const sourceOptions = [];
        const ownerName = `${this.formData.ownerFirstName || ''} ${this.formData.ownerLastName || ''}`.trim();
        if (ownerName) {
            sourceOptions.push({ label: ownerName, value: 'owner' });
        }

        this.personnel.forEach(person => {
            const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
            if (fullName && !person.sameAsPerson) {
                sourceOptions.push({ label: fullName, value: person.id });
            }
        });

        this.personnel = this.personnel.map((person, index) => ({
            ...person,
            sectionLabel: `Personnel ${index + 1}`,
            sameAsOptions: sourceOptions.filter(option => option.value !== person.id)
        }));
    }

    refreshSameAsCopies() {
        this.personnel = this.personnel.map(person => {
            if (!person.sameAsPerson) {
                return person;
            }
            const source = this.getPersonnelSourceById(person.sameAsPerson);
            if (!source) {
                return { ...person, sameAsPerson: '', isSameAs: false };
            }
            return {
                ...person,
                ...this.getSameAsValues(source),
                isSameAs: true
            };
        });
        this.updatePersonnelSameAsOptions();
    }

    handleManagersUpdate(event) {
        this.managers = event.detail.managers;
        console.log('Managers updated:', this.managers);
    }
    
    // Filenames based on field type
    getFileName(field, fileExtension) {
        const fileNames = {
            tradeLicenseCopy: 'Trade License Copy',
            memorandumCopy: 'Memorandum or Articles of Association',
            POACopy: 'POA Copy',
            reraCertificate: this.abudhabiLocation ? 'ADM Registration Certificate' : 'RERA Certificate',
            taxRegistrationCopy: 'Tax registration certificate/Non-VAT declaration form',
            vatCertificate: 'VAT Certificate',
            passportCopy: 'Passport Copy',
            emiratesIDCopy: 'Emirates ID Copy',
            visaCopy: 'Visa Copy',
            managerPassportCopy: 'Manager Passport Copy',
            managerEmiratesIDCopy: 'Manager Emirates ID Copy',
            managerVisaCopy: 'Manager Visa Copy',
            amlPolicy: 'AML Policy'
        };
        return (fileNames[field] || 'Document.');
    }
    
    // Set error messages for files
    setFileError(field, message) {
        console.log('OUTPUT setFileError(field, message) : ' + field +' '  + message)

        this[`error${field}`] = true;
        this[`check${field}`] = false;
        this[`error${field}Doc`] = message;
    }
    
    // Set success messages for files
    setFileSuccess(field) {
        console.log('OUTPUT  setFileSuccess(field) : ' + field)

        this[`check${field}`] = true;
        this[`error${field}`] = false;

        console.log('OUTPUT  this[`check${field}`] : ' + `check${field}` +  this[`check${field}`])
        console.log('OUTPUT  this[`error${field}`] : ' + `error${field}` + this[`error${field}`])
    }

    // Create Broker Account
    handleCreateBroker() {
        console.log('OUTPUT this.formData : ' , this.formData);
        console.log('OUTPUT Uploaded Files:', JSON.stringify(this.selectedMultiFiles));
        this.Spinner = false;
        this.showSuccessPage = false;
        this.checkRequetsSubmitted = false;

        this.handleCheckLicenseNumber();
        this.handleLandlineNumber();
        this.handleAgencyEmail();


        if(this.checkTradeLNumber==true){
            this.errorMessage = 'Registration cannot be completed as Trade License Number is already registered.';
            this.errorDupliTradeMessage = 'Trade License Number is already registered.';
            this.showError = true;
            return; 
            
        }

        if(this.checkAgencyEmail==true){
            this.errorMessage = 'Registration cannot be completed as Agency Email is already registered.';
            this.showError = true;
            return; 
            
        }

        if(this.checkLandlineNumber==true){
            this.errorMessage = 'Registration cannot be completed as Landline is already registered.';
            this.showError = true;
            return; 
            
        }

        if(this.showOtherInput==true && (!this.formData.otherIntroducedBy || this.formData.otherIntroducedBy.trim() === '')){
            this.errorMessage = 'As you have mentioned Other on Introduced by please enter the details of - Marketing Channel ';
            this.showError = true;
            return; 
            
        }

        // Required fields validation
        const requiredFields = [
            { key: 'agencyLocation', message: 'Brokerage Agency location cannot be empty' },
            { key: 'brokerageAgencyName', message: 'Brokerage Agency Name cannot be empty' },
            { key: 'brokerageTypes', message: 'Brokerage Types cannot be empty' },
            { key: 'tradeLicenseName', message: 'Trade License Name cannot be empty' },
            { key: 'tradeLicenseNumber', message: 'Trade License Number cannot be empty' },
            { key: 'tradeLicenseExpiryDate', message: 'Trade License Expiry Date cannot be empty' },
            { key: 'agencyEmailId', message: 'Agency Email cannot be empty' },
            { key: 'landline', message: 'Landline cannot be empty' },
            //{ key: 'trnNumber', message: 'TRN (Tax Registration Number) cannot be empty' },
            { key: 'bankName', message: 'Bank Name cannot be empty' },
            { key: 'bankBranch', message: 'Bank Branch cannot be empty' },
            { key: 'accountNumber', message: 'Account Number cannot be empty' },
            { key: 'ibanNumber', message: 'IBAN Number cannot be empty' },
            { key: 'swiftCode', message: 'Swift Code cannot be empty' },
            //{ key: 'accountCurrency', message: 'Currency cannot be empty' },
            { key: 'ownerFirstName', message: 'Owner First Name cannot be empty' },
            { key: 'ownerLastName', message: 'Owner Last Name cannot be empty' },
            { key: 'ownerEmail', message: 'Owner Email cannot be empty' },
            { key: 'ownerMobileNumber', message: 'Owner Mobile Number cannot be empty' },
            { key: 'passportExpiryDate', message: 'Passport Expiry Date cannot be empty' },
            { key: 'signatoryName', message: 'Signatory Name cannot be empty' },
            //{ key: 'nationality', message: 'Nationality cannot be empty' },
            { key: 'detailedRegisteredAddress', message: 'Detailed Registered Address cannot be empty' }
        ];

        if (this.dubaiLocation && (!this.formData.ornNumber || this.formData.ornNumber.trim() === '')) {
            requiredFields.push({ key: 'ornNumber', message: 'ORN Number cannot be empty' });
        } else if(this.dubaiLocation && (!this.formData.ornIssuanceDate || this.formData.ornIssuanceDate.trim() === '')) {
            requiredFields.push({ key: 'ornIssuanceDate', message: 'ORN Issuance Date cannot be empty' });
        } else if(this.dubaiLocation && (!this.formData.ornExpiryDate || this.formData.ornExpiryDate.trim() === '')) {
            requiredFields.push({ key: 'ornExpiryDate', message: 'ORN Expiry Date cannot be empty' });
        } else if(this.abudhabiLocation && (!this.formData.admRegistrationNumber || this.formData.admRegistrationNumber.trim() === '')) {
            requiredFields.push({ key: 'admRegistrationNumber', message: 'ADM Registration Number cannot be empty' });
        } else if(this.abudhabiLocation && (!this.formData.admIssuanceDate || this.formData.admIssuanceDate.trim() === '')) {
            requiredFields.push({ key: 'admIssuanceDate', message: 'ADM Issuance Date cannot be empty' });
        } else if(this.abudhabiLocation && (!this.formData.admExpiryDate || this.formData.admExpiryDate.trim() === '')) {
            requiredFields.push({ key: 'admExpiryDate', message: 'ADM Expiry Date cannot be empty' });
        //} else if(!this.internationLocation && (!this.formData.trnNumber || this.formData.trnNumber.trim() === '')) {
        //    requiredFields.push({ key: 'trnNumber', message: 'TRN (Tax Registration Number) cannot be empty' });
        } else if(this.internationLocation && (!this.formData.accountCurrency || this.formData.accountCurrency.trim() === '')) {
            requiredFields.push({ key: 'accountCurrency', message: 'Currency cannot be empty' });
        } else if(!this.internationLocation && (!this.formData.emiratesIDExpiryDate || this.formData.emiratesIDExpiryDate.trim() === '')) {
            requiredFields.push({ key: 'emiratesIDExpiryDate', message: 'Emirates ID Expiry Date cannot be empty' });
        } else if(/*this.internationLocation &&*/ (!this.formData.landlineCountryCode || this.formData.landlineCountryCode.trim() === '')) {
            requiredFields.push({ key: 'landlineCountryCode', message: 'Landline Country Code cannot be empty' });
        } else if(/*this.internationLocation && */(!this.formData.ownerMobileCountryCode || this.formData.ownerMobileCountryCode.trim() === '')) {
            requiredFields.push({ key: 'ownerMobileCountryCode', message: 'Owner Mobile Country Code cannot be empty' });
        }

        // Special character validation
        const specialCharRegex = /[^a-zA-Z0-9\s]/;
        // validation for special characters in fields
        let specialCharFields = [
            //{ key: 'brokerageAgencyName', message: 'Brokerage Agency Name cannot contain special characters' },
            //{ key: 'tradeLicenseNumber', message: 'Trade License Number cannot contain special characters' },
            { key: 'landline', message: 'Landline cannot contain special characters' },
            { key: 'ornNumber', message: 'ORN Number cannot contain special characters' },
            { key: 'admRegistrationNumber', message: 'ADM Registration Number cannot contain special characters' },
            //{ key: 'trnNumber', message: 'TRN (Tax Registration Number) cannot contain special characters' },
            //{ key: 'bankName', message: 'Bank Name cannot contain special characters' },
            //{ key: 'bankBranch', message: 'Bank Branch cannot contain special characters' },
            { key: 'accountNumber', message: 'Account Number cannot contain special characters' },
            { key: 'ibanNumber', message: 'IBAN Number cannot contain special characters' },
            { key: 'swiftCode', message: 'Swift Code cannot contain special characters' },
            { key: 'ownerFirstName', message: 'Owner First Name cannot contain special characters' },
            { key: 'ownerLastName', message: 'Owner Last Name cannot contain special characters' },
            { key: 'ownerMobileNumber', message: 'Owner Mobile Number cannot contain special characters' },
            { key: 'buildingNumber', message: 'Building Number cannot contain special characters' }
            
        ];

        // Email validation regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        // validation for Email validation in fields
        let emailCharFields = [
            { key: 'ownerEmail', message: 'Owner Email is in an invalid format. It should be in the format: example@eg.com.' },
            { key: 'agencyEmailId', message: 'Agency Email is in an invalid format. It should be in the format: example@eg.com.' }
        ];

       /* if (this.formData.landline && !this.formData.landline.startsWith('0')) {
            this.showError = true;
            this.errorMessage = 'Landline must start with 0.';
            return;
        }*/

        // file upload validation
        let requiredFiles = [];
        if (this.internationLocation) {
            requiredFiles = [
                { key: 'tradeLicenseCopy', message: 'Trade License/Registration Certificate is required' },
                //{ key: 'vatCertificate', message: 'VAT Certificate is required' },
                { key: 'passportCopy', message: 'Passport Copy is required' }
                //{ key: 'emiratesIDCopy', message: 'Emirates ID Copy is required' }
            ];
        } else {
            requiredFiles = [
                { key: 'tradeLicenseCopy', message: 'Trade License Copy is required' },
                //{ key: 'taxRegistrationCopy', message: 'Tax registration certificate is required' },
                { key: 'vatCertificate', message: 'VAT/Non - VAT Certificate is required' },
                { key: 'passportCopy', message: 'Passport Copy is required' },
                { key: 'emiratesIDCopy', message: 'Emirates ID Copy is required' }
            ];
        }

        /*let requiredFiles = [
            { key: 'tradeLicenseCopy', message: 'Trade License Copy is required' },
            { key: 'taxRegistrationCopy', message: 'Tax registration certificate/Non- VAT declaration form is required' },
            { key: 'vatCertificate', message: 'VAT Certificate is required' },
            { key: 'passportCopy', message: 'Passport Copy is required' },
            { key: 'emiratesIDCopy', message: 'Emirates ID Copy is required' }
        ];*/

       // Check for Required fields 
       for (let field of requiredFields) {
            let value = this.formData[field.key];

            if (!value || (Array.isArray(value) && value.length === 0) || value.trim() === '') {
                this.showError = true;
                this.errorMessage = field.message;
                return; 
            }
        }

        // Check for special characters not allowed
        for (let field of specialCharFields) {
            let value = this.formData[field.key];

            if (value && specialCharRegex.test(value)) {
                this.showError = true;
                this.errorMessage = field.message;
                return; 
            }
        }

        // Check for email validation
        /*for (let field of emailCharFields) {
            let value = this.formData[field.key];

            if (value && emailRegex.test(value)) {
                this.showError = true;
                this.errorMessage = field.message;
                return; 
            }
        }*/

        // POA Expiry date becomes mandatory if the POA is attached
        let poaCopyUploaded = this.selectedMultiFiles.find(f => f.key === 'POACopy');
        let poaExpiryDate = this.formData.POAExpiryDate; 
        if (poaCopyUploaded && (!poaExpiryDate || poaExpiryDate.trim() === '')) {
            this.showError = true;
            this.errorMessage = 'POA Expiry Date is required if POA Copy is uploaded';
            return; 
        }

        // RERA Certificate mandatory
        if (this.dubaiLocation || this.abudhabiLocation) {
            let ornCopyUploaded = this.selectedMultiFiles.find(f => f.key === 'reraCertificate');
            if (!ornCopyUploaded) {
                this.showError = true;
                this.errorMessage = this.dubaiLocation ? 'RERA Certificate is required'  : 'ADM Registration Certificate';
                return;
            }
        }

        // check for file uploaded
        for (let file of requiredFiles) {
            let fileUploaded = this.selectedMultiFiles.find(f => f.key === file.key);
            if (!fileUploaded) {
                this.showError = true;
                this.errorMessage = file.message;
                return;
            }
        }

        if (!this.isdisclaimerChecked) {
            this.showError = true;
            this.errorMessage ='You must agree to the Terms before proceeding.';
            return;
        }

        const personnelValidationError = this.validatePersonnelEntries();
        if (personnelValidationError) {
            this.showError = true;
            this.errorMessage = personnelValidationError;
            return;
        }

        // Date fields that must be in the future
        const futureDateFields = [
            { key: 'passportExpiryDate', label: 'Passport Expiry Date' },
            { key: 'emiratesIDExpiryDate', label: 'Emirates ID Expiry Date' },
            { key: 'tradeLicenseExpiryDate', label: 'Trade License Expiry Date' },
            { key: 'POAExpiryDate', label: 'POA Expiry Date' },
            { key: 'ornExpiryDate', label: 'ORN Expiry Date' },
            { key: 'admExpiryDate', label: 'ADM Expiry Date' },
            { key: 'managerPassportExpiryDate', label: 'Manager Passport Expiry Date' },
            { key: 'managerEmiratesIDExpiryDate', label: 'Manager Emirates ID Expiry Date' }   
        ];

        const todayDate = new Date(this.today); // YYYY-MM-DD

        for (let field of futureDateFields) {
            const value = this.formData[field.key];
            if (value) {
                const inputDate = new Date(value);
                if (inputDate <= todayDate) {
                    this.showError = true;
                    this.errorMessage = `${field.label} must be a future date.`;
                    return;
                }
            }
        }

        // Date fields that must be in the past
        const pastDateFields = [
            { key: 'ornIssuanceDate', label: 'ORN Issuance Date' },
            { key: 'admIssuanceDate', label: 'ADM Issuance Date' }
        ];

        for (let field of pastDateFields) {
            const value = this.formData[field.key];
            if (value) {
                const inputDate = new Date(value);
                if (inputDate >= todayDate) {
                    this.showError = true;
                    this.errorMessage = `${field.label} must be a past date.`;
                    return;
                }
            }
        }


        this.showError = false;
        this.errorMessage = '';

        this.Spinner = true;

        const inputData = this.buildInputData();
        console.log('OUTPUT buildInputData:', JSON.stringify(inputData));
        createBrokerAccount({ inputData })
        .then(result => {
            console.log('OUTPUT: ', result);
            if (!result || typeof result !== 'string' || !/^([A-Za-z0-9]{15}|[A-Za-z0-9]{18})$/.test(result)) {
                this.Spinner = false;
                this.checkRequetsSubmitted = false;
                this.showError = true;
                this.errorMessage = `Broker creation failed: ${result}`;
                return;
            }
            this.checkRequetsSubmitted = true;
            // Process all files asynchronously and upload once all are ready
            this.processFiles()
            .then((filesToUpload) => {
                console.log('OUTPUT All files processed. Uploading to Salesforce...');
                return uploadContentVersion({ filesData: filesToUpload, recordId: result });
            })
            .then((response) => {
                console.log('OUTPUT Files uploaded successfully:', response);
                this.Spinner = false;
                this.showSuccessPage = true;
            })
            .catch((error) => {
                console.error('Error uploading files:', JSON.stringify(error));
                    if (error.body && error.body.message) {
                        console.error('Detailed Error:', error.body.message);
                    }
                    this.Spinner = true;
            });
        })
        .catch(error => {
            alert('Error: You Registration can not be complete due to some server error, Please contact ORA for support.');
            console.log('OUTPUT Error creating broker :', error.body.message);
            this.Spinner = false;
            this.checkRequetsSubmitted = false;
        });
    }


    // Convert all files to Base64 and return a Promise that resolves when all files are processed
    processFiles() {
        let filesToUpload = [];

        let filePromises = this.selectedMultiFiles.map((file) => {
            return new Promise((resolve, reject) => {
                let reader = new FileReader();

                reader.onloadend = () => {
                    let base64 = reader.result.split(',')[1]; // Extract Base64
                    filesToUpload.push({
                        Title: file.filename,
                        PathOnClient: file.filename,
                        VersionData: base64
                    });
                    resolve(); // Mark this file as processed
                };

                reader.onerror = (error) => reject(error); // Handle errors
                reader.readAsDataURL(file.fileContent);
            });
        });

        // Wait for all files to finish processing before returning
        return Promise.all(filePromises).then(() => filesToUpload);
    }

    handleLoginPage() {
        // Method to handle navigation back to the Forgot Password page
       this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'Login' // Site Page Name
            }
        });
    }

    get logoImageSrcUrl() {
        return `sfsites/c/cms/delivery/media/${this.logoImageContentId}`;
    }

}