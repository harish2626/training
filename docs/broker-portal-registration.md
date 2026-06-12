**Broker Portal Registration (LWC) — Detailed Documentation

**Overview**
- **Purpose**: The `brokerPortalRegistration` Lightning Web Component implements a multi-section broker registration form including a dynamic "Company Personnel" section that allows adding/removing personnel rows, copying data from existing rows ("Same as person"), and uploading person-specific documents. The component sends a payload to the server-side Apex method to create an `Account` and related `Contact` records.

**Files**
- **LWC markup**: [force-app/main/default/lwc/brokerPortalRegistration/brokerPortalRegistration.html](force-app/main/default/lwc/brokerPortalRegistration/brokerPortalRegistration.html)
- **LWC controller**: [force-app/main/default/lwc/brokerPortalRegistration/brokerPortalRegistration.js](force-app/main/default/lwc/brokerPortalRegistration/brokerPortalRegistration.js)
- **Apex controller**: [force-app/main/default/classes/BrokerPortalController.cls](force-app/main/default/classes/BrokerPortalController.cls)

**High-level component structure**
- `brokerPortalRegistration.html`: Renders the form across several accordion sections (A-F). Section F, "Company Personnel", uses a `for:each` template to render each entry in the reactive `personnel` array. Each personnel row contains:
  - `Person Type` combobox
  - `Same as person` combobox (copies values from owner or other personnel)
  - `First Name` / `Last Name`, `Email`, `Mobile` (country code + number)
  - `Designation`, `Nationality` and expiry date fields
  - file upload(s) for person-specific documents
  - buttons to `Add New Company Personnel` and to remove rows

**Key JavaScript properties** (in `brokerPortalRegistration.js`)
- `@track personnel` : Array of personnel row objects. Each object shape includes fields such as `id`, `personType`, `sameAsPerson`, `firstName`, `lastName`, `email`, `mobileCountryCode`, `mobileNumber`, `designation`, `nationality`, `isSameAs`, `sameAsOptions`, and `sectionLabel`.
- `personTypeOptions` : Static array of picklist values provided to the Person Type combobox:
  - `Directors/Managers`
  - `Authorized signatories`
  - `Ultimate beneficial owners (UBOs) holding ≥25% ownership or control` (stored as `UBO` value)
- `formData` : Main form state that holds owner (signatory) fields and other top-level form inputs.

**Important methods and responsibilities**
- `handleAddPersonnel()` : Adds a new personnel object to `personnel` with a unique `id` and default empty fields.
- `handleRemovePersonnel(event)` : Removes a personnel entry by `id` and refreshes dependent options.
- `handlePersonnelChange(event)` : Generic handler for input changes inside a personnel row. It updates the row and triggers dependent logic when `sameAsPerson` or owner fields change.
- `updatePersonnelSameAsOptions()` : Rebuilds the `sameAsOptions` array for each personnel row. Implementation notes:
  - Adds an `owner` option when owner's full name exists.
  - Includes other personnel names as options only when that personnel is not currently a "same-as" target (prevents selecting the same source multiple times and causing duplicate copies).
  - Filters out the row's own `id` from its options so a row cannot copy from itself.
- `refreshSameAsCopies()` : When a `sameAsPerson` is set or when relevant source fields change (e.g., owner details), copies values from the selected source into the dependent row by using `getPersonnelSourceById()` and `getSameAsValues()`.
- `handlePersonnelFileUpload(event)` : Handles file selection and associates uploaded files with the corresponding personnel row (this may call Apex for `ContentVersion` upload logic elsewhere in the component).
- `validatePersonnelEntries()` : Validates each personnel row before submit. Current behavior:
  - Ensures `personType` is present for every personnel row. If not, it returns the message: "All Person Type fields are required. Click on \"Add New Company Personnel\" to add more person types." which guides users to add missing types.
  - Ensures `firstName` and `lastName` are present.
  - Ensures at least one of `email` or `mobileNumber` is present.
- `buildInputData()` : Constructs the payload object that the LWC sends to Apex. Important: the payload includes a `personnel` property which is a list of person objects with fields such as `personType`, `firstName`, `lastName`, `email`, `mobileCountryCode`, `mobileNumber`, `designation`, `nationality`, `passportExpiry`, `emiratesIdExpiry`, etc.

**Example partial payload** (what `buildInputData()` produces):
```json
{
  "companyName": "Example Co",
  "ownerFirstName": "Jane",
  "ownerLastName": "Doe",
  "personnel": [
    {
      "personType": "Directors/Managers",
      "firstName": "Ali",
      "lastName": "Khan",
      "email": "ali@example.com",
      "mobileCountryCode": "+971",
      "mobileNumber": "501234567",
      "designation": "Manager",
      "nationality": "Indian"
    },
    {
      "personType": "UBO",
      "sameAsPerson": "owner",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com"
    }
  ]
}
```

**Apex controller overview** (`BrokerPortalController.cls`)
- Primary entry: `public static Map<String, Object> createBrokerAccount(Map<String, Object> inputData)` (or similarly named method invoked from LWC).
- Responsibilities:
  - Parse `inputData` and create an `Account` (`newAccount`) using company-level fields.
  - Create a primary `Contact` for the owner/signatory based on `ownerFirstName`, `ownerLastName`, etc.
  - Process `personnel` (if provided): iterate each item in the `personnel` list and create `Contact` records tied to the created `Account`. Mapping examples:
    - `Contact.Contact_Type__c` <= `person.personType`
    - `Contact.FirstName` <= `person.firstName`
    - `Contact.LastName` <= `person.lastName`
    - `Contact.Email` <= `person.email`
    - `Contact.MobilePhone` <= `person.mobileNumber`
    - `Contact.Owner_Mobile_Country_Code__c` <= `person.mobileCountryCode`
    - `Contact.Nationality__c` <= `person.nationality`
    - `Contact.Designation__c` <= `person.designation`
    - `Contact.Passport_Expiry_Date__c` and `Contact.Emirates_ID_Expiry_Date__c` <= parsed date fields if present
  - Insert the `Contact` records in bulk and handle any `ContentVersion` attachments that were uploaded from the LWC.
  - Return a result map with success/failure status and any error messages.

**Validation & UX caveats**
- The LWC performs client-side validation via `validatePersonnelEntries()` prior to calling Apex. This prevents incomplete `personnel` objects from being sent.
- `updatePersonnelSameAsOptions()` is designed to avoid selecting a person who is already used as a "same-as" source; this reduces accidental duplicated copies across rows.
- The error message instructs users to use the `Add New Company Personnel` button to add missing `Person Type` values.

**Where to look to change behavior**
- To modify which `Person Type` values are offered, edit `personTypeOptions` in `brokerPortalRegistration.js`.
- To change the same-as filtering logic (for example, to exclude `owner` for later sections only), modify `updatePersonnelSameAsOptions()`—the method that constructs `sameAsOptions` for each row.
- To alter server-side behavior or add additional field mapping, update `BrokerPortalController.cls`.

**Next steps / Recommended improvements**
- Server-side validation mirror: add Apex-side validation for required `personType` and uniqueness constraints for critical roles.
- Unit tests: add Jest tests for `brokerPortalRegistration` JavaScript handlers and Apex tests for `BrokerPortalController.cls` to validate personnel mapping and error scenarios.

If you want, I can:
- add a short sample Jest test for `validatePersonnelEntries()` in the LWC,
- or create Apex test coverage for `createBrokerAccount` mapping of `personnel`.

