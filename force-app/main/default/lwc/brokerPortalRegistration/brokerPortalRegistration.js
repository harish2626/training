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
    @track disclaimerText = 'The submission of the information in this form does not constitute an agreement or commitment by ORA (“us” or “we”) in any way. By submitting the information in this form, you confirm that you are not entitled to, and should not, use or utilize the name of ORA, ORA Q, or any of their respective affiliates, officers, or directors in any manner whatsoever. Additionally, you are not permitted to carry out any real estate or real estate marketing activities on our behalf. For details on how we process your personal data, please review our privacy notice. By submitting this form, you also confirm that all information provided is true, accurate, and complete.';

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
    isSubmitting = false;

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

    checkcompanyAddressProof = false;
    errorcompanyAddressProof = false;
    errorcompanyAddressProofDoc = '';

    checkibanLetter = false;
    erroribanLetter = false;
    erroribanLetterDoc = '';
    
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

    // Personnel form + table state
    showLegacyPersonnel = false; // legacy owner/cards markup is hidden, superseded by form + table
    @track personForm = {};
    editingPersonId = null;

    allPersonTypeOptions = [
        { label: 'Directors/Managers', value: 'Directors/Managers' },
        { label: 'Authorized signatories', value: 'Authorized signatories' },
        { label: 'Ultimate beneficial owners (UBOs) holding ≥25% ownership or control', value: 'UBO' }
    ];

    // When "Same as" is selected, only show person types not yet assigned to that source person.
    // When no "Same as" is selected, show all types.
    get personTypeOptions() {
        if (!this.personForm.sameAsPerson) {
            return this.allPersonTypeOptions;
        }

        // Find which types the source person already covers
        const sourceId = this.personForm.sameAsPerson;
        const coveredTypes = new Set();
        this.personnel.forEach((p) => {
            // Include the source person's own type and any sameAs copies referencing them
            if (p.id === sourceId || p.sameAsPerson === sourceId) {
                // Skip the currently editing person (if editing, their type shouldn't block itself)
                if (this.editingPersonId && p.id === this.editingPersonId) return;
                if (p.personType) {
                    coveredTypes.add(p.personType);
                }
            }
        });

        return this.allPersonTypeOptions.filter((opt) => !coveredTypes.has(opt.value));
    }

    allowedFileTypes = '.png, .jpg, .jpeg, .pdf';       // Allowed file extensions
    allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];

    dubaiLocation = false;
    abudhabiLocation = false;
    internationLocation = false;

    showSuccessPage = false;
    Spinner = false;
    today;

    allNationalityOptions;

    // ===== Multi-step wizard state =====
    @track currentStep = 1;
    totalSteps = 6;

    stepConfig = [
        { num: 1, title: 'Company & License Details', subtitle: 'Brokerage type and basic information' },
        { num: 2, title: 'Billing & Tax', subtitle: 'Registered address and tax details' },
        { num: 3, title: 'Bank & Referral', subtitle: 'Bank account and ORA referral' },
        { num: 4, title: 'AML Policy', subtitle: 'Upload your AML / AML-CFT programme (optional)' },
        { num: 5, title: 'Company Personnel', subtitle: 'Signatories and beneficial owners' },
        { num: 6, title: 'Review & Submit', subtitle: 'Confirm details and submit' }
    ];


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

    


    // ===== Multi-step wizard getters =====
    get isStep1() { return this.currentStep === 1; }
    get isStep2() { return this.currentStep === 2; }
    get isStep3() { return this.currentStep === 3; }
    get isStep4() { return this.currentStep === 4; }
    get isStep5() { return this.currentStep === 5; }
    get isStep6() { return this.currentStep === 6; }

    get currentStepTitle() { return this.stepConfig[this.currentStep - 1].title; }
    get currentStepDescription() { return this.stepConfig[this.currentStep - 1].subtitle; }

    get showBackButton() { return this.currentStep > 1; }
    get showNextButton() { return this.currentStep < this.totalSteps; }

    get stepItems() {
        return this.stepConfig.map((s) => {
            const completed = s.num < this.currentStep;
            const active = s.num === this.currentStep;
            let cssClass = 'step-item';
            if (active) { cssClass += ' step-item_active'; }
            if (completed) { cssClass += ' step-item_completed'; }
            return { ...s, completed, active, cssClass };
        });
    }

    // ===== Field getters (keep displayed values when navigating between steps) =====
    get brokerageTypes() { return this.formData.brokerageTypes; }
    get brokerageAgencyName() { return this.formData.brokerageAgencyName; }
    get brokerOfficeName() { return this.formData.brokerOfficeName; }
    get tradeLicenseName() { return this.formData.tradeLicenseName; }
    get tradeLicenseNumber() { return this.formData.tradeLicenseNumber; }
    get tradeLicenseExpiryDate() { return this.formData.tradeLicenseExpiryDate; }
    get agencyEmailId() { return this.formData.agencyEmailId; }
    get agencyContactNumber() { return this.formData.agencyContactNumber; }
    get agencyCountryCode() { return this.formData.agencyCountryCode; }
    get landlineCountryCode() { return this.formData.landlineCountryCode; }
    get landline() { return this.formData.landline; }
    get website() { return this.formData.website; }
    get POAExpiryDate() { return this.formData.POAExpiryDate; }
    get ornNumber() { return this.formData.ornNumber; }
    get ornIssuanceDate() { return this.formData.ornIssuanceDate; }
    get ornExpiryDate() { return this.formData.ornExpiryDate; }
    get admRegistrationNumber() { return this.formData.admRegistrationNumber; }
    get admIssuanceDate() { return this.formData.admIssuanceDate; }
    get admExpiryDate() { return this.formData.admExpiryDate; }
    get linkedInProfileName() { return this.formData.linkedInProfileName; }
    get instagramProfileName() { return this.formData.instagramProfileName; }
    get facebookProfileName() { return this.formData.facebookProfileName; }
    get officeNumber() { return this.formData.officeNumber; }
    get buildingNumber() { return this.formData.buildingNumber; }
    get streetName() { return this.formData.streetName; }
    get detailedRegisteredAddress() { return this.formData.detailedRegisteredAddress; }
    get poBox() { return this.formData.poBox; }
    get trnNumber() { return this.formData.trnNumber; }
    get bankName() { return this.formData.bankName; }
    get bankBranch() { return this.formData.bankBranch; }
    get accountNumber() { return this.formData.accountNumber; }
    get ibanNumber() { return this.formData.ibanNumber; }
    get swiftCode() { return this.formData.swiftCode; }
    get accountCurrency() { return this.formData.accountCurrency; }
    get agencyExecutiveId() { return this.formData.agencyExecutiveId; }
    get ownerFirstName() { return this.formData.ownerFirstName; }
    get ownerLastName() { return this.formData.ownerLastName; }
    get ownerEmail() { return this.formData.ownerEmail; }
    get ownerMobileCountryCode() { return this.formData.ownerMobileCountryCode; }
    get ownerMobileNumber() { return this.formData.ownerMobileNumber; }
    get designation() { return this.formData.designation; }
    get passportExpiryDate() { return this.formData.passportExpiryDate; }
    get emiratesIDExpiryDate() { return this.formData.emiratesIDExpiryDate; }
    get signatoryName() { return this.formData.signatoryName; }
    get otherIntroducedBy() { return this.formData.otherIntroducedBy; }

    // ===== Wizard navigation =====
    handleStepClick(event) {
        const target = parseInt(event.currentTarget.dataset.step, 10);
        // Allow jumping to any step for viewing purposes (validation is only enforced on Next/Submit)
        if (!isNaN(target) && target >= 1 && target <= this.totalSteps && target !== this.currentStep) {
            this.currentStep = target;
            this.showError = false;
            this.errorMessage = '';
            this.scrollToTop();
        }
    }

    handleBack() {
        if (this.currentStep > 1) {
            this.currentStep -= 1;
            this.showError = false;
            this.errorMessage = '';
            this.scrollToTop();
        }
    }

    handleNext() {
        if (this.validateCurrentStep() && this.currentStep < this.totalSteps) {
            this.currentStep += 1;
            this.scrollToTop();
        }
    }

    scrollToTop() {
        const content = this.template.querySelector('.content');
        if (content) { content.scrollTop = 0; }
    }

    // Validate the fields currently rendered for the active step before advancing.
    // File inputs are excluded here (their presence is tracked in selectedMultiFiles and
    // enforced at final submit) so navigating between steps does not falsely block the user.
    validateCurrentStep() {
        // Step 5 (Company Personnel) is validated by coverage, not by the add/edit form fields
        // (an empty form is fine once the required people are already in the table).
        if (this.currentStep === 5) {
            const personnelError = this.validatePersonnelCoverage();
            if (personnelError) {
                this.showError = true;
                this.errorMessage = personnelError;
                return false;
            }
            this.showError = false;
            this.errorMessage = '';
            return true;
        }

        const controls = [...this.template.querySelectorAll('lightning-input, lightning-combobox')];
        let valid = true;
        controls.forEach((ctrl) => {
            if (ctrl.type === 'file') { return; }
            if (typeof ctrl.reportValidity === 'function' && !ctrl.reportValidity()) {
                valid = false;
            }
        });

        if (!valid) {
            this.showError = true;
            this.errorMessage = 'Please complete all required fields correctly before continuing.';
            return false;
        }

        // Step 1: duplicate checks must be clear before continuing
        if (this.currentStep === 1 && (this.checkTradeLNumber || this.checkAgencyEmail || this.checkLandlineNumber)) {
            this.showError = true;
            return false;
        }

        this.showError = false;
        this.errorMessage = '';
        return true;
    }

    // ===== Personnel: add/edit form + table =====
    blankPersonForm() {
        return {
            id: `person-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            personType: '', sameAsPerson: '', firstName: '', lastName: '', email: '',
            mobileCountryCode: '', mobileNumber: '', designation: '', nationality: '',
            passportExpiryDate: '', emiratesIDExpiryDate: '', signatoryName: '',
            passportCopy: null, emiratesIDCopy: null, visaCopy: null, proofOfAddress: null
        };
    }

    get isEditingPerson() { return !!this.editingPersonId; }
    get savePersonLabel() { return this.editingPersonId ? 'Update Person' : 'Save Person'; }
    get personFormTitle() { return this.editingPersonId ? 'Edit Person' : 'Add Person'; }

    // Proof of Address applies only to UBOs and Authorized Signatories
    get showProofOfAddress() {
        return this.personForm.personType === 'UBO'
            || this.personForm.personType === 'Authorized signatories';
    }

    // Emirates ID and Visa are not required for international agencies
    get isEmiratesIdRequired() { return !this.internationLocation; }
    get isVisaCopyRequired() { return !this.internationLocation; }

    // "Same as" quick-fill: available whenever there is at least one other person to copy from.
    // This allows the user to reuse the same individual across multiple roles (person types)
    // regardless of whether all required types are already covered.
    get showSameAs() {
        return this.personnel.some((p) => p.id !== this.editingPersonId);
    }

    get sameAsOptions() {
        const labels = this.personTypeLabels;
        const allTypes = ['Directors/Managers', 'Authorized signatories', 'UBO'];

        // For each original (non-sameAs) person, determine which types they already cover
        // (either as their own entry or via sameAs copies referencing them).
        const typesCoveredBySource = {};
        this.personnel.forEach((p) => {
            const sourceId = p.sameAsPerson || p.id;
            if (!typesCoveredBySource[sourceId]) {
                typesCoveredBySource[sourceId] = new Set();
            }
            if (p.personType) {
                typesCoveredBySource[sourceId].add(p.personType);
            }
        });

        return this.personnel
            .filter((p) => {
                if (p.id === this.editingPersonId) return false;
                if (p.sameAsPerson) return false; // only originals are selectable
                // Hide if this person already covers all types
                const covered = typesCoveredBySource[p.id] || new Set();
                return covered.size < allTypes.length;
            })
            .map((p) => {
                const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed';
                const typeLabel = labels[p.personType] || p.personType || '';
                return { label: typeLabel ? `${name} (${typeLabel})` : name, value: p.id };
            });
    }

    // When "Same as" is chosen the detail fields are locked (it's the same individual,
    // only the Person Type / role differs). No duplicate contact is created on the backend.
    get personFieldsDisabled() { return !!this.personForm.sameAsPerson; }

    get personTypeLabels() {
        return {
            'Directors/Managers': 'Directors/Managers',
            'Authorized signatories': 'Authorized Signatories',
            'UBO': 'Ultimate Beneficial Owner (UBO)'
        };
    }

    get personnelRows() {
        const labels = this.personTypeLabels;
        const nameById = {};
        this.personnel.forEach((p) => {
            nameById[p.id] = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed';
        });
        return this.personnel.map((p) => {
            const name = `${p.firstName || ''} ${p.lastName || ''}`.trim();
            const mobile = `${p.mobileCountryCode || ''} ${p.mobileNumber || ''}`.trim();
            const sameAs = p.sameAsPerson ? (nameById[p.sameAsPerson] || '') : '';
            return {
                id: p.id,
                typeLabel: labels[p.personType] || p.personType,
                name: name || '—',
                email: p.email || '—',
                mobile: mobile || '—',
                isSameAs: !!p.sameAsPerson,
                sameAsLabel: sameAs ? `Same as ${sameAs}` : ''
            };
        });
    }

    handlePersonFormChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.value;

        // Quick-fill: copy an existing person's data (Person Type is left for the user to set)
        if (field === 'sameAsPerson') {
            this.personForm = { ...this.personForm, sameAsPerson: value };
            if (value) {
                const source = this.personnel.find((p) => p.id === value);
                if (source) {
                    this.personForm = {
                        ...this.personForm,
                        firstName: source.firstName,
                        lastName: source.lastName,
                        email: source.email,
                        mobileCountryCode: source.mobileCountryCode,
                        mobileNumber: source.mobileNumber,
                        designation: source.designation,
                        nationality: source.nationality,
                        passportExpiryDate: source.passportExpiryDate,
                        emiratesIDExpiryDate: source.emiratesIDExpiryDate,
                        signatoryName: source.signatoryName,
                        passportCopy: source.passportCopy,
                        emiratesIDCopy: source.emiratesIDCopy,
                        visaCopy: source.visaCopy,
                        proofOfAddress: source.proofOfAddress
                    };
                }
                // Clear personType if it's no longer available for this source
                const availableTypes = this.personTypeOptions.map((o) => o.value);
                if (this.personForm.personType && !availableTypes.includes(this.personForm.personType)) {
                    this.personForm = { ...this.personForm, personType: '' };
                }
            }
            return;
        }

        this.personForm = { ...this.personForm, [field]: value };
    }

    handlePersonFormFileUpload(event) {
        const field = event.target.dataset.field;
        if (!event.target.files || !event.target.files.length) { return; }
        const file = event.target.files[0];
        const ext = file.name.split('.').pop().toLowerCase();
        const maxSize = 5 * 1024 * 1024;

        if (!this.allowedExtensions.includes(ext)) {
            event.target.value = '';
            this.showError = true;
            this.errorMessage = `Invalid file type. Allowed: ${this.allowedFileTypes}`;
            return;
        }
        if (file.size > maxSize) {
            event.target.value = '';
            this.showError = true;
            this.errorMessage = 'File too large. Max size allowed is 5MB.';
            return;
        }

        const baseFileName = this.getFileName(field, ext);
        const filename = `${baseFileName}_${Date.now()}_${this.personForm.id}.${ext}`;
        this.personForm = { ...this.personForm, [field]: { filename, fileContent: file } };
    }

    handleSavePerson() {
        const controls = [...this.template.querySelectorAll('.person-form lightning-input, .person-form lightning-combobox')];
        let valid = true;
        controls.forEach((c) => {
            if (c.type === 'file') { return; }
            if (typeof c.reportValidity === 'function' && !c.reportValidity()) { valid = false; }
        });
        if (!valid) {
            this.showError = true;
            this.errorMessage = 'Please complete the required fields for this person.';
            return;
        }
        if (!this.personForm.email && !this.personForm.mobileNumber) {
            this.showError = true;
            this.errorMessage = 'Please provide an email or mobile number for this person.';
            return;
        }
        // Proof of Address is required only for UBOs and Authorized Signatories (real persons).
        if (!this.personForm.sameAsPerson && this.showProofOfAddress && !this.personForm.proofOfAddress) {
            this.showError = true;
            this.errorMessage = 'Proof of Address is required for UBOs and Authorized Signatories.';
            return;
        }
         if (!this.personForm.sameAsPerson && !this.personForm.passportCopy) {
            this.showError = true;
            this.errorMessage = 'Passport Copy is required for this person.';
            return;
        }

         if (!this.personForm.sameAsPerson && !this.internationLocation && !this.personForm.visaCopy) {
            this.showError = true;
            this.errorMessage = 'Visa Copy is required for this person.';
            return;
        }

         if (!this.personForm.sameAsPerson && !this.internationLocation && !this.personForm.emiratesIDCopy) {
            this.showError = true;
            this.errorMessage = 'Emirates ID Copy is required for this person.';
            return;
        }


        if (!this.personForm.sameAsPerson) {
            this.syncPersonFiles(this.personForm);
        }

        const existingIndex = this.personnel.findIndex((p) => p.id === this.personForm.id);
        if (existingIndex >= 0) {
            const updated = [...this.personnel];
            updated[existingIndex] = { ...this.personForm };
            this.personnel = updated;
        } else {
            this.personnel = [...this.personnel, { ...this.personForm }];
        }

        this.editingPersonId = null;
        this.personForm = this.blankPersonForm();
        this.showError = false;
        this.errorMessage = '';
    }

    handleEditPerson(event) {
        const id = event.currentTarget.dataset.id;
        const person = this.personnel.find((p) => p.id === id);
        if (!person) { return; }
        this.personForm = { ...person };
        this.editingPersonId = id;
        this.showError = false;
        this.errorMessage = '';
        this.scrollToTop();
    }

    handleCancelPersonEdit() {
        this.editingPersonId = null;
        this.personForm = this.blankPersonForm();
        this.showError = false;
        this.errorMessage = '';
    }

    handleDeletePerson(event) {
        const id = event.currentTarget.dataset.id;
        // Remove the person plus any "same as" role entries that point to them
        const removedIds = this.personnel
            .filter((p) => p.id === id || p.sameAsPerson === id)
            .map((p) => p.id);
        this.personnel = this.personnel.filter((p) => removedIds.indexOf(p.id) === -1);
        this.selectedMultiFiles = this.selectedMultiFiles.filter(
            (f) => !(f.key && removedIds.some((rid) => f.key.startsWith(`${rid}-`)))
        );
        if (removedIds.indexOf(this.editingPersonId) !== -1) {
            this.editingPersonId = null;
            this.personForm = this.blankPersonForm();
        }
    }

    // Keep per-person files in selectedMultiFiles (keyed by personId-field) for upload.
    syncPersonFiles(person) {
        const fileFields = ['passportCopy', 'emiratesIDCopy', 'visaCopy', 'proofOfAddress'];
        fileFields.forEach((f) => {
            const key = `${person.id}-${f}`;
            this.selectedMultiFiles = this.selectedMultiFiles.filter((x) => x.key !== key);
            if (person[f] && person[f].fileContent) {
                this.selectedMultiFiles = [
                    ...this.selectedMultiFiles,
                    { key, filename: person[f].filename, fileContent: person[f].fileContent }
                ];
            }
        });
    }

    // At least one person required for each of the three types
    validatePersonnelCoverage() {
        const labels = this.personTypeLabels;
        const required = ['Directors/Managers', 'Authorized signatories', 'UBO'];
        const present = new Set(this.personnel.map((p) => p.personType));
        const missing = required.filter((t) => !present.has(t));
        if (missing.length) {
            return `Please add at least one person for: ${missing.map((m) => labels[m]).join(', ')}.`;
        }
        return null;
    }

    connectedCallback() {
        this.showError = false;
        this.Spinner = false;
        this.showSuccessPage = false;
        this.personForm = this.blankPersonForm();
        this.today = new Date().toISOString().slice(0,10);

        Promise.resolve().then(() => {
            if (this.disclaimer) {
                this.disclaimerText = this.disclaimer;
            }
        });

        console.log("OUTPUT disclaimer: ", this.disclaimer);
    }

    renderedCallback() {
        this.updateDisclaimerHtml();
    }

    updateDisclaimerHtml() {
        const container = this.template.querySelector('[data-id="disclaimerTextContainer"]');
        if (!container) {
            return;
        }

        const text = this.disclaimer || this.disclaimerText;
        const linkedText = text.replace(
            /privacy notice/gi,
            '<a href="https://ora-uae.com/privacy-policy/" target="_blank" rel="noreferrer noopener">privacy notice</a>'
        );
        container.innerHTML = linkedText;
    }

    // Check for trade license already in existing broker account
    handleCheckLicenseNumber(){
        return getTradeLicenseNumber({tradeLicenseNumber : this.formData.tradeLicenseNumber})
        .then((result) => {
            console.log('OUTPUT handleCheckLicenseNumber : ', result);
            this.checkTradeLNumber = result;
            if(this.checkTradeLNumber==true){
                this.errorMessage = 'Registration cannot be completed as Trade License Number is already registered.';
                this.errorDupliTradeMessage = 'Trade License Number is already registered.';
                this.showError = true;
            }
            return result;
        }).catch((err) => {
            console.log('OUTPUT Error :' + err);
            return false;
        });
    }
    
    // Check for Landline Number already in existing broker account
    handleLandlineNumber(){
        return getLandlineNumber({landline : this.formData.landline})
        .then((result) => {
            console.log('OUTPUT handleLandlineNumber : ', result);
            this.checkLandlineNumber = result;
            if(this.checkLandlineNumber==true){
                this.errorMessage = 'Registration cannot be completed as Landline is already registered.';
                this.showError = true;
            }
            return result;
        }).catch((err) => {
            console.log('OUTPUT Error :' + err);
            return false;
        });
    }

    // Check for agencyEmail already in existing broker account
    handleAgencyEmail(){
        return getAgencyEmail({agencyEmailId : this.formData.agencyEmailId})
        .then((result) => {
            console.log('OUTPUT handleAgencyEmail : ', result);
            this.checkAgencyEmail = result;
            if(this.checkAgencyEmail==true){
                this.errorMessage = 'Registration cannot be completed as Agency Email is already registered.';
                this.showError = true;
            }
            return result;
        }).catch((err) => {
            console.log('OUTPUT Error :' + err);
            return false;
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
        // The Apex (not yet rewritten for the array model) always builds a primary "Admin"
        // Contact from the owner* fields. We map the first person into those fields so that
        // contact is valid, and represent that same person in the personnel array as a
        // sameAsPerson:'owner' role stub so the Apex tags their role onto the Admin contact
        // instead of creating a duplicate Contact. The remaining people are sent as full entries.
        const personnelPayload = [];
        let ownerFields = {};

        if (this.personnel.length) {
            const [primary, ...rest] = this.personnel;
            const primaryId = primary.id;

            ownerFields = {
                ownerFirstName: primary.firstName,
                ownerLastName: primary.lastName,
                ownerEmail: primary.email,
                ownerMobileNumber: primary.mobileNumber,
                ownerMobileCountryCode: primary.mobileCountryCode,
                nationality: primary.nationality,
                designation: primary.designation,
                passportExpiryDate: primary.passportExpiryDate,
                emiratesIDExpiryDate: primary.emiratesIDExpiryDate,
                signatoryName: primary.signatoryName
            };

            // Role stub for the primary person (mapped onto the Admin/owner contact)
            personnelPayload.push({
                id: primary.id,
                sameAsPerson: 'owner',
                personType: primary.personType
            });

            rest.forEach((person) => {
                if (person.sameAsPerson) {
                    // "Same as" => no new Contact; just add this role to the referenced person.
                    // A reference to the primary resolves to the owner's role bucket.
                    const sourceId = person.sameAsPerson === primaryId ? 'owner' : person.sameAsPerson;
                    personnelPayload.push({
                        id: person.id,
                        sameAsPerson: sourceId,
                        personType: person.personType
                    });
                } else {
                    personnelPayload.push({
                        id: person.id,
                        personType: person.personType,
                        firstName: person.firstName,
                        lastName: person.lastName,
                        email: person.email,
                        mobileCountryCode: person.mobileCountryCode,
                        mobileNumber: person.mobileNumber,
                        designation: person.designation,
                        nationality: person.nationality,
                        passportExpiryDate: person.passportExpiryDate,
                        emiratesIDExpiryDate: person.emiratesIDExpiryDate,
                        signatoryName: person.signatoryName
                    });
                }
            });
        }

        return {
            ...this.formData,
            ...ownerFields,
            personnel: personnelPayload
        };
    }

    validatePersonnelEntries() {
        for (let person of this.personnel) {
            if (!person.personType || person.personType.trim() === '') {
                return 'All Person Type fields are required. Click on "Add Person" to add more person types.';
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
            amlPolicy: 'AML Policy',
            proofOfAddress: 'Proof of Address',
            companyAddressProof: 'Company Registered Address Proof',
            ibanLetter: 'IBAN Letter'
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
    async handleCreateBroker() {
        // DEF-02: Prevent double submission
        if (this.isSubmitting) {
            return;
        }

        console.log('OUTPUT this.formData : ' , this.formData);
        console.log('OUTPUT Uploaded Files:', JSON.stringify(this.selectedMultiFiles));
        this.Spinner = false;
        this.showSuccessPage = false;
        this.checkRequetsSubmitted = false;

        // DEF-01: Await duplicate checks before proceeding with validation
        this.Spinner = true;
        await Promise.all([
            this.handleCheckLicenseNumber(),
            this.handleLandlineNumber(),
            this.handleAgencyEmail()
        ]);
        this.Spinner = false;


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
        } else if((!this.formData.landlineCountryCode || this.formData.landlineCountryCode.trim() === '')) {
            requiredFields.push({ key: 'landlineCountryCode', message: 'Landline Country Code cannot be empty' });
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
                { key: 'companyAddressProof', message: 'Proof of the company\u2019s Registered Address is required' },
                { key: 'ibanLetter', message: 'IBAN Letter is required' }
            ];
        } else {
            requiredFiles = [
                { key: 'tradeLicenseCopy', message: 'Trade License Copy is required' },
                { key: 'vatCertificate', message: 'VAT/Non - VAT Certificate is required' },
                { key: 'companyAddressProof', message: 'Proof of the company\u2019s Registered Address is required' },
                { key: 'ibanLetter', message: 'IBAN Letter is required' }
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

        const personnelValidationError = this.validatePersonnelCoverage();
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

        // DEF-06: Validate personnel date fields (passport/emirates ID expiry must be in the future)
        for (let person of this.personnel) {
            const personName = `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unnamed person';
            if (person.passportExpiryDate) {
                const passportDate = new Date(person.passportExpiryDate);
                if (passportDate <= todayDate) {
                    this.showError = true;
                    this.errorMessage = `Passport Expiry Date for "${personName}" must be a future date.`;
                    return;
                }
            }
            if (person.emiratesIDExpiryDate) {
                const emiratesDate = new Date(person.emiratesIDExpiryDate);
                if (emiratesDate <= todayDate) {
                    this.showError = true;
                    this.errorMessage = `Emirates ID Expiry Date for "${personName}" must be a future date.`;
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

        // DEF-02: Set submitting guard and show spinner
        this.isSubmitting = true;
        this.Spinner = true;

        const inputData = this.buildInputData();
        console.log('OUTPUT buildInputData:', JSON.stringify(inputData));
        createBrokerAccount({ inputData })
        .then(result => {
            console.log('OUTPUT: ', result);
            if (!result || typeof result !== 'string' || !/^([A-Za-z0-9]{15}|[A-Za-z0-9]{18})$/.test(result)) {
                this.Spinner = false;
                this.isSubmitting = false;
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
                this.isSubmitting = false;
                this.showSuccessPage = true;
            })
            .catch((error) => {
                console.error('Error uploading files:', JSON.stringify(error));
                    if (error.body && error.body.message) {
                        console.error('Detailed Error:', error.body.message);
                    }
                    // DEF-03: Fixed — was incorrectly set to true, trapping the user
                    this.Spinner = false;
                    this.isSubmitting = false;
                    this.showError = true;
                    this.errorMessage = 'File upload failed. Your registration was saved but documents could not be uploaded. Please contact ORA for support.';
            });
        })
        .catch(error => {
            this.showError = true;
            this.errorMessage = 'Error: Your Registration cannot be completed due to a server error. Please contact ORA for support.';
            console.log('OUTPUT Error creating broker :', error.body ? error.body.message : error);
            this.Spinner = false;
            this.isSubmitting = false;
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