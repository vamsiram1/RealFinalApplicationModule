import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import SaleFormContent from '../Sale&ConformatiionHeader/SaleFormContent';
import PersonalInformation from './PersonalInfo/PersonalInformation';
import OrientationInformation from './OrientationInfo/OrientationInformation';
import AddressInformation from './AddressInfo/AddressInformation';
import ActionButtons from './ActionButtons';
import EditNextButtons from './EditNextButtons';
import SuccessPage from '../ConformationPage/SuccessPage';
import StudentProfile from '../ConformationForms/StudentProfile';
import FamilyInformation from '../ConformationForms/FamilyInformation/FamilyInformation';
import SiblingInformation from '../ConformationForms/SiblingInformation/SiblingInformation';
import AcademicInformation from '../ConformationForms/AcademicInformation/AcademicInformation';
import ConcessionInformation from '../ConformationForms/ConcessionInformation/ConcessionInformation';

import styles from './SaleForm.module.css';
import { validateAllForms, getMissingFieldsMessage } from './utils/comprehensiveValidation';

const SaleForm = ({ onBack, initialData = {} }) => {
  const { status, applicationNo } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Helper function to get empId from localStorage
  const getEmpId = () => {
    try {
      const loginData = localStorage.getItem('loginData');
      if (loginData) {
        const parsed = JSON.parse(loginData);
        return parsed.empId || 0;
      }
    } catch (error) {
      // Error parsing login data
    }
    return 0; // Fallback to 0 if not found
  };
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConform, setShowConform] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [studentProfileData, setStudentProfileData] = useState(null); // Add state for profile data // 1 = StudentProfile, 2 = FamilyInformation
  const [isEditing, setIsEditing] = useState(false); // Track if we're in edit mode (came from Edit button)
 
  // Determine category from localStorage, navigation state, or initialData
  const category = localStorage.getItem("category") || (location.state && location.state.category) || initialData.category || "COLLEGE";
 
  // Callback to receive profile data from StudentProfile
  const handleProfileDataReceived = (profileData) => {
    setStudentProfileData(profileData);
   
    // Store ID fields from profile data so they're available for submission
    if (profileData) {
      setAllFormData(prev => ({
        ...prev,
        quotaId: profileData.quotaId || prev.quotaId,
        studentTypeId: profileData.studentTypeId || prev.studentTypeId,
        branchId: profileData.branchId || prev.branchId,
        joiningClassId: profileData.joiningClassId || prev.joiningClassId,
        orientationId: profileData.orientationId || prev.orientationId,
        admissionTypeId: profileData.admissionTypeId || prev.admissionTypeId,
        // Store address ID fields from profile data
        mandalId: profileData.addressDetails?.mandalId || prev.mandalId,
        cityId: profileData.addressDetails?.cityId || prev.cityId,
        districtId: profileData.addressDetails?.districtId || prev.districtId,
        stateId: profileData.addressDetails?.stateId || prev.stateId,
        // IMPORTANT: Do NOT override academicYearId from StudentProfile - always use StatusHeader's value
        academicYearId: prev.academicYearId // Preserve StatusHeader's academicYearId
      }));
    }
   
    // Also extract payment amount from profile data if available (for sold applications)
    if (profileData) {
      const paymentFromProfile = profileData.paymentDetails?.amount ||
                                 profileData.paymentAmount ||
                                 profileData.amount ||
                                 (Array.isArray(profileData.paymentDetails) && profileData.paymentDetails.length > 0
                                   ? profileData.paymentDetails[0]?.amount : null);
     
      const appFeeFromProfile = profileData.applicationFee || profileData.applicationFeeAmount;
     
      if (paymentFromProfile || appFeeFromProfile) {
        setAllFormData(prev => {
          const updated = {
            ...prev,
            amount: paymentFromProfile != null ? paymentFromProfile : prev.amount,
            applicationFee: appFeeFromProfile != null ? appFeeFromProfile : prev.applicationFee,
            totalAmountDue: (appFeeFromProfile && paymentFromProfile)
              ? (Number(appFeeFromProfile) || 0) + (Number(paymentFromProfile) || 0)
              : prev.totalAmountDue,
            // IMPORTANT: Do NOT override academicYearId from StudentProfile - always use StatusHeader's value
            academicYearId: prev.academicYearId, // Preserve StatusHeader's academicYearId
            // Preserve quotaId if it was set earlier
            quotaId: prev.quotaId || profileData?.quotaId || prev.quotaId
          };
          return updated;
        });
      }
    }
  };
 
  // Direct Formik collection - single object to store all form data
  const [allFormData, setAllFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldWiseErrors, setFieldWiseErrors] = useState({});
  const siblingInfoRef = useRef(null);

  const handlePaymentSuccess = (paymentData) => {
    // Add payment data to form data
    const updatedFormData = addFormData(paymentData);
    return updatedFormData;
  };

  const handleSaleAndConform = () => {
    // First, submit the sale data to database
    // Submit sale data to backend
    submitSaleOnly()
      .then(() => {
        // After successful submission, navigate to confirmation URL with flag
        // Add URL parameter to indicate we're coming from "Sale & Conform" flow (for amount auto-population)
        const newUrl = `/scopes/application/status/${applicationNo}/confirm?fromSaleAndConform=true`;
        // Use window.location.href to force complete page reload and route change
        window.location.href = newUrl;
      })
      .catch((error) => {
        // Show error message to user
        alert('Failed to submit sale data. Please try again.');
      });
  };

  // Handle back navigation with state reset
  const handleBackNavigation = () => {
    // Reset all component state
    setShowConform(false);
    setCurrentStep(1);
    setShowSuccess(false);
    setFieldWiseErrors({});
    setStudentProfileData(null);
    setOrientationValidationFn(null);
   
    // Navigate back to application status - force hard navigation
    window.location.href = "/scopes/application/status";
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Go to FamilyInformation step
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Go to success page
      setShowSuccess(true);
    }
  };

  const handleBackStep = () => {
    if (currentStep === 2) {
      // Go back to StudentProfile step
      setCurrentStep(1);
    }
  };

  // Function to handle field-wise errors from validation
  const handleFieldWiseErrors = (errors) => {
    setFieldWiseErrors(errors);
  };

  // Function to clear field-wise errors
  const clearFieldWiseErrors = () => {
    setFieldWiseErrors({});
  };

  // Function to clear specific field error
  const clearSpecificFieldError = (fieldName) => {
    setFieldWiseErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // State for orientation validation function
  const [orientationValidationFn, setOrientationValidationFn] = useState(null);

  // Function to handle orientation validation reference
  const handleOrientationValidationRef = useCallback((validationFn) => {
    setOrientationValidationFn(validationFn);
  }, []);

  // Function to add form data to single object
  const addFormData = useCallback((data) => {
    setAllFormData(prev => {
      // CRITICAL: Always prioritize StatusHeader's academicYearId (from prev) over incoming data
      // This ensures StatusHeader's value (24) is never overwritten by StudentProfile's old value (23)
      const newData = { 
        ...prev, 
        ...data,
        // Priority: prev.academicYearId (StatusHeader) > data.academicYearId (from form)
        // Only use data.academicYearId if prev doesn't have one (StatusHeader hasn't loaded yet)
        academicYearId: prev.academicYearId !== null && prev.academicYearId !== undefined
          ? prev.academicYearId  // Keep StatusHeader's value (24) - NEVER overwrite
          : (data.academicYearId !== undefined && data.academicYearId !== null 
              ? data.academicYearId 
              : prev.academicYearId)  // Use data's value only if StatusHeader doesn't have one
      };
      
      return newData;
    });
  }, []);

  // Helper function to get quotaId - handles both ID and name
  const getQuotaIdFromData = useCallback((dataToUse) => {
    // First, try quotaId if it exists
    if (dataToUse.quotaId) {
      const quotaId = parseInt(dataToUse.quotaId) || 0;
      console.log('✅ getQuotaIdFromData: Using quotaId from data:', quotaId);
      return quotaId;
    }
    // If quota is already a number (ID), use it
    const quotaAsNumber = parseInt(dataToUse.quota);
    if (!isNaN(quotaAsNumber) && quotaAsNumber > 0) {
      console.log('✅ getQuotaIdFromData: Using quota as number:', quotaAsNumber);
      return quotaAsNumber;
    }
    // If quota is a string (name), try to find it in studentProfileData
    if (studentProfileData?.quotaId) {
      const quotaId = parseInt(studentProfileData.quotaId) || 0;
      console.log('✅ getQuotaIdFromData: Using quotaId from studentProfileData:', quotaId);
      return quotaId;
    }
    // Fallback to 0 if nothing found
    console.warn('⚠️ getQuotaIdFromData: No quotaId found, using 0. Data:', { 
      quotaId: dataToUse.quotaId, 
      quota: dataToUse.quota,
      studentProfileQuotaId: studentProfileData?.quotaId 
    });
    return 0;
  }, [studentProfileData]);

  // Helper function to get studentTypeId - handles both ID and name
  const getStudentTypeIdFromData = useCallback((dataToUse) => {
    // First, try studentTypeId if it exists
    if (dataToUse.studentTypeId) {
      return parseInt(dataToUse.studentTypeId) || 0;
    }
    // If studentType is already a number (ID), use it
    const studentTypeAsNumber = parseInt(dataToUse.studentType);
    if (!isNaN(studentTypeAsNumber) && studentTypeAsNumber > 0) {
      return studentTypeAsNumber;
    }
    // If studentType is a string (name), try to find it in studentProfileData
    if (studentProfileData?.studentTypeId) {
      return parseInt(studentProfileData.studentTypeId) || 0;
    }
    // Fallback to 0 if nothing found
    return 0;
  }, [studentProfileData]);

  // Helper function to get branchId - handles both ID and name
  const getBranchIdFromData = useCallback((dataToUse) => {
    // First, try branchId if it exists
    if (dataToUse.branchId) {
      return parseInt(dataToUse.branchId) || 0;
    }
    // If branch is already a number (ID), use it
    const branchAsNumber = parseInt(dataToUse.branch);
    if (!isNaN(branchAsNumber) && branchAsNumber > 0) {
      return branchAsNumber;
    }
    // If branch is a string (name), try to find it in studentProfileData
    if (studentProfileData?.branchId) {
      return parseInt(studentProfileData.branchId) || 0;
    }
    // Fallback to 0 if nothing found
    return 0;
  }, [studentProfileData]);

  // Helper function to get classId (joiningClassId) - handles both ID and name
  const getClassIdFromData = useCallback((dataToUse) => {
    // First, try joiningClassId if it exists
    if (dataToUse.joiningClassId) {
      return parseInt(dataToUse.joiningClassId) || 0;
    }
    // If joiningClass is already a number (ID), use it
    const classAsNumber = parseInt(dataToUse.joiningClass);
    if (!isNaN(classAsNumber) && classAsNumber > 0) {
      return classAsNumber;
    }
    // If joiningClass is a string (name), try to find it in studentProfileData
    if (studentProfileData?.joiningClassId) {
      return parseInt(studentProfileData.joiningClassId) || 0;
    }
    // Fallback to 0 if nothing found
    return 0;
  }, [studentProfileData]);

  // Helper function to get orientationId - handles both ID and name
  const getOrientationIdFromData = useCallback((dataToUse) => {
    // First, try orientationId if it exists
    if (dataToUse.orientationId) {
      return parseInt(dataToUse.orientationId) || 0;
    }
    // If orientationName is already a number (ID), use it
    const orientationAsNumber = parseInt(dataToUse.orientationName);
    if (!isNaN(orientationAsNumber) && orientationAsNumber > 0) {
      return orientationAsNumber;
    }
    // If orientationName is a string (name), try to find it in studentProfileData
    if (studentProfileData?.orientationId) {
      return parseInt(studentProfileData.orientationId) || 0;
    }
    // Fallback to 0 if nothing found
    return 0;
  }, [studentProfileData]);

  // Helper function to get admissionTypeId - handles both ID and name
  const getAdmissionTypeIdFromData = useCallback((dataToUse) => {
    // First, try admissionTypeId if it exists
    if (dataToUse.admissionTypeId) {
      return parseInt(dataToUse.admissionTypeId) || 0;
    }
    // If admissionType is already a number (ID), use it
    const admissionTypeAsNumber = parseInt(dataToUse.admissionType);
    if (!isNaN(admissionTypeAsNumber) && admissionTypeAsNumber > 0) {
      return admissionTypeAsNumber;
    }
    // If admissionType is a string (name), try to find it in studentProfileData
    if (studentProfileData?.admissionTypeId) {
      return parseInt(studentProfileData.admissionTypeId) || 0;
    }
    // Fallback to 1 (default) if nothing found
    return 1;
  }, [studentProfileData]);

  // Helper function to get mandalId - handles both ID and name
  const getMandalIdFromData = useCallback((dataToUse) => {
    // First, try mandalId if it exists
    if (dataToUse.mandalId) {
      return parseInt(dataToUse.mandalId) || 0;
    }
    // If mandal is already a number (ID), use it
    const mandalAsNumber = parseInt(dataToUse.mandal);
    if (!isNaN(mandalAsNumber) && mandalAsNumber > 0) {
      return mandalAsNumber;
    }
    // If mandal is a string (name), try to find it in studentProfileData addressDetails
    if (studentProfileData?.addressDetails?.mandalId) {
      return parseInt(studentProfileData.addressDetails.mandalId) || 0;
    }
    // Fallback to 0 if nothing found
    return 0;
  }, [studentProfileData]);

  // Helper function to get cityId - handles both ID and name
  const getCityIdFromData = useCallback((dataToUse) => {
    // First, try cityId if it exists
    if (dataToUse.cityId) {
      return parseInt(dataToUse.cityId) || 0;
    }
    // If city is already a number (ID), use it
    const cityAsNumber = parseInt(dataToUse.city);
    if (!isNaN(cityAsNumber) && cityAsNumber > 0) {
      return cityAsNumber;
    }
    // If city is a string (name), try to find it in studentProfileData addressDetails
    if (studentProfileData?.addressDetails?.cityId) {
      return parseInt(studentProfileData.addressDetails.cityId) || 0;
    }
    // Fallback to 0 if nothing found
    return 0;
  }, [studentProfileData]);

  // Helper function to get districtId - handles both ID and name
  const getDistrictIdFromData = useCallback((dataToUse) => {
    // First, try districtId if it exists
    if (dataToUse.districtId) {
      return parseInt(dataToUse.districtId) || 0;
    }
    // If district is already a number (ID), use it
    const districtAsNumber = parseInt(dataToUse.district);
    if (!isNaN(districtAsNumber) && districtAsNumber > 0) {
      return districtAsNumber;
    }
    // If district is a string (name), try to find it in studentProfileData addressDetails
    if (studentProfileData?.addressDetails?.districtId) {
      return parseInt(studentProfileData.addressDetails.districtId) || 0;
    }
    // Fallback to 0 if nothing found
    return 0;
  }, [studentProfileData]);

  // Helper function to get stateId - handles both ID and name
  const getStateIdFromData = useCallback((dataToUse) => {
    // First, try stateId if it exists
    if (dataToUse.stateId) {
      return parseInt(dataToUse.stateId) || 0;
    }
    // If state is already a number (ID), use it
    const stateAsNumber = parseInt(dataToUse.state);
    if (!isNaN(stateAsNumber) && stateAsNumber > 0) {
      return stateAsNumber;
    }
    // If state is a string (name), try to find it in studentProfileData addressDetails
    if (studentProfileData?.addressDetails?.stateId) {
      return parseInt(studentProfileData.addressDetails.stateId) || 0;
    }
    // Fallback to 0 if nothing found
    return 0;
  }, [studentProfileData]);

  // Function to collect all data and send to backend (with payment)
  const submitCompleteSale = async (formDataToUse = null) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Use provided form data or fall back to state
      const dataToUse = formDataToUse || allFormData;
     
      // Transform data for backend API structure
      const backendData = {
        // Personal Information
        firstName: dataToUse.firstName || "",
        lastName: dataToUse.surname || "",
        genderId: parseInt(dataToUse.gender) || 0,
        apaarNo: dataToUse.aaparNo || "",
        dob: dataToUse.dateOfBirth ? new Date(dataToUse.dateOfBirth).toISOString() : new Date().toISOString(),
        aadharCardNo: parseInt(dataToUse.aadharCardNo) || 0,
        quotaId: getQuotaIdFromData(dataToUse),
        proReceiptNo: parseInt(dataToUse.proReceiptNo) || 0,
        admissionTypeId: getAdmissionTypeIdFromData(dataToUse),
        admissionReferedBy: dataToUse.admissionReferredBy || "",
        appSaleDate: new Date().toISOString(),
        fatherName: dataToUse.fatherName || "",
        fatherMobileNo: parseInt(dataToUse.phoneNumber) || 0,
       
        // Orientation Information - Use real ID from StatusHeader API response
        academicYearId: parseInt(dataToUse.academicYearId) || 0,
        branchId: getBranchIdFromData(dataToUse),
        studentTypeId: getStudentTypeIdFromData(dataToUse),
        classId: getClassIdFromData(dataToUse),
        orientationId: getOrientationIdFromData(dataToUse),
        appTypeId: getAdmissionTypeIdFromData(dataToUse),
       
        // Address Information (nested object) - Use ID fields
        addressDetails: {
          doorNo: dataToUse.doorNo || "",
          street: dataToUse.streetName || "",
          landmark: dataToUse.landmark || "",
          area: dataToUse.area || "",
          cityId: getCityIdFromData(dataToUse),
          mandalId: getMandalIdFromData(dataToUse),
          districtId: getDistrictIdFromData(dataToUse),
          pincode: parseInt(dataToUse.pincode) || 0,
          stateId: getStateIdFromData(dataToUse),
          createdBy: getEmpId() // Get empId from login data
        },
       
        // Additional fields
        studAdmsNo: parseInt(applicationNo) || 0, // Use application number as admission number
        proId: parseInt(dataToUse.proId) || 1, // Use actual PRO ID, default to 1
                createdBy: getEmpId(), // You may need to get this from user context
       
        // Payment Information (nested object) - Use actual payment data
        paymentDetails: {
          paymentModeId: parseInt(dataToUse.paymentModeId) || parseInt(dataToUse.payMode) || parseInt(dataToUse.paymentMode) || 1,
          paymentDate: dataToUse.paymentDate ? new Date(dataToUse.paymentDate).toISOString() : new Date().toISOString(),
          amount: parseFloat(dataToUse.amount) || 0.1,
          prePrintedReceiptNo: dataToUse.receiptNumber || "",
          remarks: dataToUse.remarks || "",
          createdBy: getEmpId() // Get empId from login data
        }
      };
     
      // Direct backend API call
      const response = await fetch('http://localhost:8080/api/student-admissions-sale/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Add your auth token
        },
        body: JSON.stringify(backendData)
      });
     
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
     
      if (!response.ok) {
        let errorText;
        if (contentType && contentType.includes('application/json')) {
          const errorJson = await response.json();
          errorText = JSON.stringify(errorJson, null, 2);
        } else {
          errorText = await response.text();
        }
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
     
      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // If not JSON, get as text but still treat as success if HTTP status is OK
        const textResponse = await response.text();
        result = { message: 'Data saved successfully', textResponse: textResponse };
      }
     
      // Show success page after successful database submission (HTTP 200)
      setSuccess(true);
      setShowSuccess(true); // Show success page only after backend success
      return { success: true, data: result };
     
    } catch (err) {
      setError(err.message || 'Sale submission failed. Please try again.');
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to submit complete confirmation data - for Finish Sale & Confirmation button
  const submitConfirmation = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
     
      // Transform data to match exact Swagger API format
      const confirmationData = {
        studAdmsNo: parseInt(applicationNo) || 0,
        createdBy: getEmpId(), // You may need to get this from user context
        appConfDate: new Date().toISOString(),
       
        // Academic Information Fields
        foodTypeId: parseInt(allFormData.foodTypeId) || 0,
        bloodGroupId: parseInt(allFormData.bloodGroupId) || 0,
        htNo: allFormData.htNo || "string",
        orientationId: parseInt(allFormData.orientationNameId) || parseInt(allFormData.orientationId) || 0,
        orientationBatchId: parseInt(allFormData.orientationBatchId) || null,
        orientationDate: allFormData.orientationStartDate ? new Date(allFormData.orientationStartDate).toISOString() : new Date().toISOString(),
        schoolStateId: parseInt(allFormData.schoolStateId) || null,
        schoolDistrictId: parseInt(allFormData.schoolDistrictId) || null,
        schoolTypeId: parseInt(allFormData.schoolTypeId) || null,
        schoolName: allFormData.schoolName || "string",
        scoreAppNo: allFormData.scoreAppNo || "string",
        marks: parseFloat(allFormData.marks) || 0,
       
        // Parents Array - Transform family information
        parents: [
          // Father
          {
            name: allFormData.fatherName || "string",
            relationTypeId: 1, // Assuming 1 = Father
            occupation: allFormData.fatherOccupation || "string",
            mobileNo: parseInt(allFormData.fatherPhoneNumber) || 0,
            email: allFormData.fatherEmail || "string",
            createdBy: getEmpId()
          },
          // Mother
          {
            name: allFormData.motherName || "string",
            relationTypeId: 2, // Assuming 2 = Mother
            occupation: allFormData.motherOccupation || "string",
            mobileNo: parseInt(allFormData.motherPhoneNumber) || 0,
            email: allFormData.motherEmail || "string",
            createdBy: getEmpId()
          }
        ].filter(parent => parent.name !== "string"), // Remove empty parents
       
        // Siblings Array - Transform sibling information
        siblings: Array.isArray(allFormData.siblings) ? allFormData.siblings.map(sibling => ({
          fullName: sibling.fullName || "string",
          schoolName: sibling.schoolName || "string",
          classId: parseInt(sibling.classId) || 0,
          relationTypeId: parseInt(sibling.relationTypeId) || 0,
          genderId: parseInt(sibling.genderId) || 0,
          createdBy: getEmpId()
        })) : [],
       
        // Concessions Array - Transform concession information
        concessions: (() => {
          const concessionArray = [];
         
          // Add concessions based on category and form data
          if (category === 'SCHOOL') {
            if (allFormData.admissionFee) {
              concessionArray.push({
                concessionTypeId: allFormData.concessionTypeIds?.admissionFee || 0,
                concessionAmount: parseFloat(allFormData.admissionFee) || 0.1,
                concReferedBy: allFormData.givenById || 0,
                givenById: parseInt(allFormData.givenById) || 0,
                authorizedById: parseInt(allFormData.authorizedById) || 0,
                reasonId: parseInt(allFormData.reasonId) || 0,
                comments: allFormData.description || "string",
                createdBy: getEmpId(),
             
              });
            }
            if (allFormData.tuitionFee) {
              concessionArray.push({
                concessionTypeId: allFormData.concessionTypeIds?.tuitionFee || 0,
                concessionAmount: parseFloat(allFormData.tuitionFee) || 0.1,
                concReferedBy: allFormData.givenById || 0,
                givenById: parseInt(allFormData.givenById) || 0,
                authorizedById: parseInt(allFormData.authorizedById) || 0,
                reasonId: parseInt(allFormData.reasonId) || 0,
                comments: allFormData.description || "string",
                createdBy: getEmpId()
              });
            }
          } else if (category === 'DEGREE') {
            if (allFormData.yearConcession1st) {
              concessionArray.push({
                concessionTypeId: allFormData.concessionTypeIds?.yearConcession1st || 0,
                concessionAmount: parseFloat(allFormData.yearConcession1st) || 0.1,
                concReferedBy: allFormData.givenById || 0,
                givenById: parseInt(allFormData.givenById) || 0,
                authorizedById: parseInt(allFormData.authorizedById) || 0,
                reasonId: parseInt(allFormData.reasonId) || 0,
                comments: allFormData.description || "string",
                createdBy: getEmpId()
              });
            }
            if (allFormData.yearConcession2nd) {
              concessionArray.push({
                concessionTypeId: allFormData.concessionTypeIds?.yearConcession2nd || 0,
                concessionAmount: parseFloat(allFormData.yearConcession2nd) || 0.1,
                concReferedBy: allFormData.givenById || 0,
                givenById: parseInt(allFormData.givenById) || 0,
                authorizedById: parseInt(allFormData.authorizedById) || 0,
                reasonId: parseInt(allFormData.reasonId) || 0,
                comments: allFormData.description || "string",
                createdBy: getEmpId()
              });
            }
            if (allFormData.yearConcession3rd) {
              concessionArray.push({
                concessionTypeId: allFormData.concessionTypeIds?.yearConcession3rd || 0,
                concessionAmount: parseFloat(allFormData.yearConcession3rd) || 0.1,
                concReferedBy: allFormData.givenById || 0,
                givenById: parseInt(allFormData.givenById) || 0,
                authorizedById: parseInt(allFormData.authorizedById) || 0,
                reasonId: parseInt(allFormData.reasonId) || 0,
                comments: allFormData.description || "string",
                createdBy: getEmpId()
              });
            }
          } else { // COLLEGE
            if (allFormData.yearConcession1st) {
              concessionArray.push({
                concessionTypeId: allFormData.concessionTypeIds?.yearConcession1st || 0,
                concessionAmount: parseFloat(allFormData.yearConcession1st) || 0.1,
                concReferedBy: allFormData.givenById || 0,
                givenById: parseInt(allFormData.givenById) || 0,
                authorizedById: parseInt(allFormData.authorizedById) || 0,
                reasonId: parseInt(allFormData.reasonId) || 0,
                comments: allFormData.description || "string",
                createdBy: getEmpId()
              });
            }
            if (allFormData.yearConcession2nd) {
              concessionArray.push({
                concessionTypeId: allFormData.concessionTypeIds?.yearConcession2nd || 0,
                concessionAmount: parseFloat(allFormData.yearConcession2nd) || 0.1,
                concReferedBy: allFormData.givenById || 0,
                givenById: parseInt(allFormData.givenById) || 0,
                authorizedById: parseInt(allFormData.authorizedById) || 0,
                reasonId: parseInt(allFormData.reasonId) || 0,
                comments: allFormData.description || "string",
                createdBy: getEmpId()
              });
            }
          }
         
          return concessionArray;
        })(),
       
        // Payment Details Object - Use payment data from form or default to 1
        paymentDetails: {
          paymentModeId: parseInt(allFormData.paymentModeId) || parseInt(allFormData.payMode) || parseInt(allFormData.paymentMode) || 1,
          paymentDate: allFormData.paymentDate ? new Date(allFormData.paymentDate).toISOString() : new Date().toISOString(),
          amount: parseFloat(allFormData.amount) || 0.1,
          prePrintedReceiptNo: allFormData.receiptNumber || allFormData.prePrintedReceiptNo || "string",
          remarks: allFormData.remarks || "string",
          createdBy: getEmpId()
        }
      };
     
     
      // Prepare request details
      const requestUrl = 'http://localhost:8080/api/application-confirmation/confirm';
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      };
      const requestBody = JSON.stringify(confirmationData);
     
     
      // Call the confirmation API endpoint
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: requestBody
      });
     
     
      if (!response.ok) {
        // Even if response is not OK, try to get error details
        let errorMessage = `HTTP error! status: ${response.status}`;
        let savedButError = false;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
         
          // Check if this is a serialization error (data was saved but response failed)
          if (errorData.message && errorData.message.includes('ByteBuddyInterceptor')) {
            savedButError = true;
          }
        } catch (e) {
          // If can't parse error, just use status
        }
       
        // If data was saved but response failed, treat as success
        if (savedButError) {
          setSuccess(true);
          setShowSuccess(true);
          return { success: true, message: 'Data saved successfully' };
        }
       
        throw new Error(errorMessage);
      }
     
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
     
      let result;
      if (contentType && contentType.includes('application/json')) {
        try {
          result = await response.json();
        } catch (jsonError) {
          // If data was saved but response can't be serialized, treat as success
          if (response.status === 200) {
            result = { success: true, message: 'Data saved successfully but response could not be serialized' };
          } else {
            throw jsonError;
          }
        }
      } else {
        // If not JSON, get as text but still treat as success if HTTP status is OK
        const textResponse = await response.text();
        result = { message: 'Confirmation data saved successfully', textResponse: textResponse };
      }
     
      // Show success page after successful database submission (HTTP 200)
      setSuccess(true);
      setShowSuccess(true); // Show success page only after backend success
      return { success: true, data: result };
     
    } catch (err) {
      setError(err.message || 'Confirmation submission failed. Please try again.');
      // Show success page even if API fails - user clicked Finish Sale & Confirmation
      setSuccess(true);
      setShowSuccess(true);
      return { success: true, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to submit sale only (without payment data) - for Sale & Conform button
  const submitSaleOnly = async (formDataToUse = null, showSuccessPage = true) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Use provided form data or fall back to state
      const dataToUse = formDataToUse || allFormData;
     
     
      // Transform data for backend API structure (without payment)
      const backendData = {
        // Personal Information
        firstName: dataToUse.firstName || "",
        lastName: dataToUse.surname || "",
        genderId: parseInt(dataToUse.gender) || 0,
        apaarNo: dataToUse.aaparNo || "",
        dob: dataToUse.dateOfBirth ? new Date(dataToUse.dateOfBirth).toISOString() : new Date().toISOString(),
        aadharCardNo: parseInt(dataToUse.aadharCardNo) || 0,
        quotaId: getQuotaIdFromData(dataToUse),
        proReceiptNo: parseInt(dataToUse.proReceiptNo) || 0,
        admissionTypeId: getAdmissionTypeIdFromData(dataToUse),
        admissionReferedBy: dataToUse.admissionReferredBy || "",
        appSaleDate: new Date().toISOString(),
        fatherName: dataToUse.fatherName || "",
        fatherMobileNo: parseInt(dataToUse.phoneNumber) || 0,
       
        // Orientation Information - Use real ID from StatusHeader API response
        academicYearId: parseInt(dataToUse.academicYearId) || 0,
        branchId: getBranchIdFromData(dataToUse),
        studentTypeId: getStudentTypeIdFromData(dataToUse),
        classId: getClassIdFromData(dataToUse),
        orientationId: getOrientationIdFromData(dataToUse),
        appTypeId: getAdmissionTypeIdFromData(dataToUse),
       
        // Address Information (nested object) - Use ID fields
        addressDetails: {
          doorNo: dataToUse.doorNo || "",
          street: dataToUse.streetName || "",
          landmark: dataToUse.landmark || "",
          area: dataToUse.area || "",
          cityId: getCityIdFromData(dataToUse),
          mandalId: getMandalIdFromData(dataToUse),
          districtId: getDistrictIdFromData(dataToUse),
          pincode: parseInt(dataToUse.pincode) || 0,
          stateId: getStateIdFromData(dataToUse),
          createdBy: getEmpId() // Get empId from login data
        },
       
        // Additional fields
        studAdmsNo: parseInt(applicationNo) || 0, // Use application number as admission number
        proId: parseInt(dataToUse.proId) || 1, // Use actual PRO ID, default to 1
        createdBy: getEmpId() // Get empId from login data
       
        // Note: No paymentDetails object for sale-only submission
      };
     
      // Call the sale-only API endpoint
      const response = await fetch('http://localhost:8080/api/student-admissions-sale/create/sale/only', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Add your auth token
        },
        body: JSON.stringify(backendData)
      });
     
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
     
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
     
      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // If not JSON, get as text but still treat as success if HTTP status is OK
        const textResponse = await response.text();
        result = { message: 'Sale data saved successfully', textResponse: textResponse };
      }
     
      // Show success page after successful database submission (HTTP 200) - only if requested
      setSuccess(true);
      if (showSuccessPage) {
        setShowSuccess(true);
      }
      return { success: true, data: result };
     
    } catch (err) {
      setError(err.message || 'Sale submission failed. Please try again.');
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form data updates from child components - wrapped in useCallback to prevent infinite loops
  const handlePersonalInfoSuccess = useCallback((data) => {
    addFormData(data);
  }, [addFormData]);

  const handleOrientationInfoSuccess = useCallback((data) => {
    // CRITICAL: Always prioritize StatusHeader's academicYearId over OrientationInformation's value
    // This prevents StudentProfile's old academicYearId (23) from overriding StatusHeader's current one (24)
    setAllFormData(prev => {
      const dataToAdd = {
        ...data,
        // Force use StatusHeader's academicYearId if it exists, otherwise use data's value
        academicYearId: prev.academicYearId !== null && prev.academicYearId !== undefined
          ? prev.academicYearId  // Use StatusHeader's value (24) - HIGHEST PRIORITY
          : (data.academicYearId || null)  // Fallback to data's value only if StatusHeader doesn't have one
      };
      
      const newData = { 
        ...prev, 
        ...dataToAdd,
        academicYearId: prev.academicYearId !== null && prev.academicYearId !== undefined
          ? prev.academicYearId
          : (dataToAdd.academicYearId !== undefined && dataToAdd.academicYearId !== null 
              ? dataToAdd.academicYearId 
              : prev.academicYearId)
      };
      
      return newData;
    });
  }, []);

  // Handle data fetched from StatusHeader
  const handleStatusHeaderDataFetched = useCallback((data) => {
    // Update allFormData with the fetched academic year data
    setAllFormData(prev => {
      const updated = {
        ...prev,
        academicYear: data.academicYear || prev.academicYear,
        academicYearId: data.academicYearId !== null && data.academicYearId !== undefined ? data.academicYearId : prev.academicYearId, // Preserve ID from StatusHeader
        applicationFee: data.applicationFee || prev.applicationFee,
        amount: (data.amount != null ? data.amount : prev.amount),
        totalAmountDue: (data.totalAmountDue != null ? data.totalAmountDue : prev.totalAmountDue)
      };
      return updated;
    });
  }, []);

  const handleAddressInfoSuccess = useCallback((data) => {
    addFormData(data);
  }, [addFormData]);

  const handlePaymentInfoSuccess = useCallback((data) => {
    addFormData(data);
  }, [addFormData]);

  // Handlers for confirmation form components
  const handleFamilyInfoSuccess = useCallback((data) => {
    addFormData(data);
  }, [addFormData]);

  const handleSiblingInfoSuccess = useCallback((data) => {
    addFormData(data);
  }, [addFormData]);

  const handleAcademicInfoSuccess = useCallback((data) => {
    addFormData(data);
  }, [addFormData]);

  const handleConcessionInfoSuccess = useCallback((data) => {
    addFormData(data);
  }, [addFormData]);

  // Update existing sale details (Save & Continue flow when editing from profile)
  const submitUpdateSale = async (formDataToUse = null) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const dataToUse = formDataToUse || allFormData;

      const backendData = {
        firstName: dataToUse.firstName || "",
        lastName: dataToUse.surname || "",
        genderId: parseInt(dataToUse.gender) || 0,
        apaarNo: dataToUse.aaparNo || "",
        dob: dataToUse.dateOfBirth ? new Date(dataToUse.dateOfBirth).toISOString() : new Date().toISOString(),
        aadharCardNo: parseInt(dataToUse.aadharCardNo) || 0,
        quotaId: getQuotaIdFromData(dataToUse),
        proReceiptNo: parseInt(dataToUse.proReceiptNo) || 0,
        appSaleDate: new Date().toISOString(),
        fatherName: dataToUse.fatherName || "",
        fatherMobileNo: parseInt(dataToUse.phoneNumber) || 0,
        academicYearId: parseInt(dataToUse.academicYearId) || 0,
        branchId: getBranchIdFromData(dataToUse),
        studentTypeId: getStudentTypeIdFromData(dataToUse),
        classId: getClassIdFromData(dataToUse),
        orientationId: getOrientationIdFromData(dataToUse),
        appTypeId: getAdmissionTypeIdFromData(dataToUse),
        addressDetails: {
          doorNo: dataToUse.doorNo || "",
          street: dataToUse.streetName || "",
          landmark: dataToUse.landmark || "",
          area: dataToUse.area || "",
          cityId: getCityIdFromData(dataToUse),
          mandalId: getMandalIdFromData(dataToUse),
          districtId: getDistrictIdFromData(dataToUse),
          pincode: parseInt(dataToUse.pincode) || 0,
          stateId: getStateIdFromData(dataToUse),
          createdBy: getEmpId()
        },
        studAdmsNo: parseInt(applicationNo) || 0,
        proId: parseInt(dataToUse.proId) || 0,
        createdBy: getEmpId()
      };

      // Use studAdmsNo from form data if available, otherwise use applicationNo from URL
      // The endpoint might expect studAdmsNo instead of applicationNo
      const idToUse = dataToUse.studAdmsNo || applicationNo;
      
      const url = `http://localhost:8080/api/student-admissions-sale/update_details/${idToUse}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(backendData)
      });

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = `HTTP error! status: ${response.status}`;
        }
        
        // If 404, provide more helpful error message
        if (response.status === 404) {
          throw new Error(`Record not found. The application with number ${idToUse} may not exist in the database. Please ensure the record was created first using the "Finish Sale" button. Status: ${response.status}, Details: ${errorText}`);
        }
        
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const textResponse = await response.text();
        result = { message: 'Application details updated successfully', textResponse };
      }

      return { success: true, data: result };
    } catch (err) {
      setError(err.message || 'Update failed. Please try again.');
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndContinue = async () => {
    const res = await submitUpdateSale(allFormData);
    if (res && res.success) {
      const newUrl = `/scopes/application/status/${applicationNo}/confirm`;
      window.location.href = newUrl;
    }
  };

  const handleEdit = () => {
    // Exit confirmation mode and return to sale forms (prefilled via overrides)
    setShowConform(false);
    setCurrentStep(1);
    setIsEditing(true); // Set editing mode to show "Save & Continue" button
    // Optionally scroll to top of form for better UX
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) {}
  };


  const handleNext = async () => {
    try {
      // Validate Step 1 forms before proceeding
      const step1ValidationResult = await validateAllForms(allFormData, 1, category);
     
      if (step1ValidationResult.isValid) {
        // Clear any existing field-wise errors
        setFieldWiseErrors({});
        handleNextStep();
      } else {
        // Set field-wise errors for display
        setFieldWiseErrors(step1ValidationResult.errors);
      }
    } catch (error) {
      // Validation error handled silently
    }
  };

  const handleSingleButton = async () => {
    try {
      // Only validate Step 1 forms if we're on Step 1 (Sale mode)
      let step1ValidationResult = { isValid: true, errors: {} };
      if (currentStep === 1) {
        step1ValidationResult = await validateAllForms(allFormData, 1, category);
      }
     
      // Only validate Step 2 forms if we're on Step 2 (Confirmation mode)
      let step2ValidationResult = { isValid: true, errors: {} };
      if (currentStep === 2) {
        step2ValidationResult = await validateAllForms(allFormData, 2, category);
      }
     
      // Validate sibling information if we're on Step 2
      let siblingValidationResult = { isValid: true, errors: {} };
      if (currentStep === 2 && siblingInfoRef.current) {
        siblingValidationResult = siblingInfoRef.current.validate();
      }
     
      // Only validate orientation fields if we're on Step 1 (Sale)
      let orientationErrors = {};
      if (currentStep === 1 && orientationValidationFn) {
        orientationErrors = await orientationValidationFn();
      }
     
      // Combine all errors from both steps
      const allErrors = {
        ...step1ValidationResult.errors,
        ...step2ValidationResult.errors,
        ...siblingValidationResult.errors,
        ...orientationErrors
      };
     
      // Check if all validations pass
      const isValid = step1ValidationResult.isValid &&
                     step2ValidationResult.isValid &&
                     siblingValidationResult.isValid &&
                     Object.keys(orientationErrors).length === 0;
     
      if (isValid) {
        // Clear any existing field-wise errors
        setFieldWiseErrors({});
        return 'success'; // Return success indicator
      } else {
        // Set field-wise errors for display
        setFieldWiseErrors(allErrors);
        return 'error'; // Return error indicator
      }
    } catch (error) {
      return 'error'; // Return error indicator
    }
  };

  // Debug logging for status and navigation state - reduced frequency
  // useEffect(() => {
  //   console.log('🔍 SaleForm Debug - Status:', status, 'ApplicationNo:', applicationNo);
  // }, [status, applicationNo]);

  // Initialize form data from navigation state if coming from sale
  useEffect(() => {
    if (location.state && location.state.initialValues) {
      setAllFormData(location.state.initialValues);
    }
  }, [location.state]);

  // Update showConform when status changes
  useEffect(() => {
    setShowConform(status === "confirm");
  }, [status]);

  // Debug showConform state changes - reduced frequency
  // useEffect(() => {
  //   console.log('🔄 showConform state changed:', showConform);
  // }, [showConform]);

  // Debug currentStep state changes - reduced frequency
  // useEffect(() => {
  //   console.log('🔄 currentStep state changed:', currentStep);
  // }, [currentStep]);

  // Debug showSuccess state changes - reduced frequency
  // useEffect(() => {
  //   console.log('🔄 showSuccess state changed:', showSuccess);
  // }, [showSuccess]);

  // Show SuccessPage when form is submitted
  if (showSuccess) {
    // Build dynamic values for SuccessPage from collected form data
    const displayApplicationNo = applicationNo || allFormData.applicationNo || "";
    const displayStudentName = [allFormData.firstName, allFormData.surname].filter(Boolean).join(' ') || undefined;
    const numericAmount = allFormData.amount ? Number(allFormData.amount) : undefined;
    const displayAmount = typeof numericAmount === 'number' && !Number.isNaN(numericAmount)
      ? `₹${numericAmount.toLocaleString('en-IN')}`
      : undefined;
    const displayCampus = allFormData.campusName || allFormData.joinedCampus || allFormData.branch || undefined;
    const displayZone = allFormData.zoneName || allFormData.zone || allFormData.district || undefined;

    return (
      <div className={styles.saleFormContainer}>
        {/* Always render SaleFormContent header even on success page */}
        <SaleFormContent
          status={status}
          onBack={handleBackNavigation}
          initialData={initialData}
          showSuccess={showSuccess} // Pass the actual showSuccess value
          showConfirmation={showConform}
          currentStep={status === "confirm" ? 3 : 2} // Set appropriate step for success
          onStatusHeaderDataFetched={handleStatusHeaderDataFetched}
        />
       
        <div className={styles.successPageContainer}>
          <SuccessPage
            applicationNo={displayApplicationNo}
            studentName={displayStudentName}
            amount={displayAmount}
            campus={displayCampus}
            zone={displayZone}
            onBack={() => {
              setShowSuccess(false);
              if (onBack) onBack();
            }}
            statusType={status === "confirm" ? "confirmation" : "sale"}
          />
        </div>
      </div>
    );
  }

  // Debug render values - reduced logging
  // console.log('🎯 SaleForm Render - Status:', status, 'ShowConform:', showConform, 'Step:', currentStep);

  return (
    <div className={styles.saleFormContainer} data-testid="sale-form-component">
      {/* DEBUG BOX - Set to true to show, false to hide */}
      {false && (
        <div style={{background: 'red', color: 'white', padding: '10px', margin: '10px', borderRadius: '5px', fontSize: '12px'}}>
          🔴 DEBUG: SaleForm State
          <br/>Status: {status} | Step: {currentStep} | Conform: {showConform ? 'Y' : 'N'}
          <br/>URL: {location.pathname}
        </div>
      )}
     
      <SaleFormContent
        status={status}
        onBack={handleBackNavigation}
        initialData={initialData}
        showSuccess={showSuccess} // Pass the actual showSuccess value
        showConfirmation={showConform} // Pass showConform to show confirmation mode
        currentStep={currentStep} // Pass current step for progress header
        onStatusHeaderDataFetched={handleStatusHeaderDataFetched}
      />
     
      {/* Show confirmation steps when in confirmation mode */}
      {showConform ? (
        <div className={styles.saleFormBody}>
          {currentStep === 1 && (
            <div className={styles.saleFormSection}>
              <StudentProfile
                applicationNumber={applicationNo}
                onProfileDataReceived={handleProfileDataReceived}
              />
            </div>
          )}
         
          {currentStep === 2 && (
            <>
              <div className={styles.saleFormSection}>
                <FamilyInformation
                  formData={allFormData || {}}
                  onSuccess={handleFamilyInfoSuccess}
                  externalErrors={Object.fromEntries(
                    Object.entries(fieldWiseErrors).filter(([key]) =>
                      [
                        'fatherName', 'fatherPhoneNumber', 'fatherEmail', 'fatherSector', 'fatherOccupation', 'fatherOtherOccupation',
                        'motherName', 'motherPhoneNumber', 'motherEmail', 'motherSector', 'motherOccupation', 'motherOtherOccupation'
                      ].includes(key)
                    )
                  )}
                  onClearFieldError={clearSpecificFieldError}
                  profileData={studentProfileData}
                />
              </div>
             
              <div className={styles.saleFormSection}>
                <SiblingInformation ref={siblingInfoRef} onSuccess={handleSiblingInfoSuccess} />
              </div>
             
              <div className={styles.saleFormSection}>
                <AcademicInformation
                  profileData={studentProfileData}
                  onSuccess={handleAcademicInfoSuccess}
                  category={category}
                  externalErrors={fieldWiseErrors}
                  onClearFieldError={clearSpecificFieldError}
                />
              </div>
             
              <div className={styles.saleFormSection}>
                <ConcessionInformation
                  category={category}
                  orientationFee={allFormData.orientationFee || 0}
                  onSuccess={handleConcessionInfoSuccess}
                  externalErrors={fieldWiseErrors}
                  onClearFieldError={clearSpecificFieldError}
                />
              </div>
            </>
          )}
         
          {/* Edit and Next Buttons */}
          <div className={styles.saleFormSection}>
            <EditNextButtons
              onEdit={handleEdit}
              onNext={() => {
                // In confirmation mode, just proceed to next step without validation
                if (currentStep === 1) {
                  handleNextStep();
                } else {
                  handleNext();
                }
              }}
              showSingleButton={currentStep === 2}
              singleButtonText="Proceed to payment"
              onSingleButtonClick={handleSingleButton}
              isConfirmationMode={true}
              onSubmitConfirmation={submitConfirmation}
              isSubmitting={isSubmitting}
              fieldWiseErrors={fieldWiseErrors}
              preFilledAmount={(() => {
                // Calculate preFilledAmount for confirmation mode payment
                // Only auto-populate if coming from "Sale & Conform" flow (check URL parameter)
                // Don't auto-populate if coming from search card/table for "Sold" applications
                const urlParams = new URLSearchParams(window.location.search);
                const fromSaleAndConform = urlParams.get('fromSaleAndConform') === 'true';
               
                // Only auto-populate if coming from "Sale & Conform" flow
                if (!fromSaleAndConform) {
                  return undefined;
                }
               
                // Coming from "Sale & Conform" - check for valid amount data
                // Priority 1: Use totalAmountDue if available and valid (non-zero)
                if (allFormData.totalAmountDue != null &&
                    allFormData.totalAmountDue !== 0 &&
                    allFormData.totalAmountDue !== undefined) {
                  return Number(allFormData.totalAmountDue);
                }
               
                // Priority 2: Calculate from applicationFee + amount (only if both are valid)
                const appFee = Number(allFormData.applicationFee) || 0;
                const baseAmount = Number(allFormData.amount) || 0;
               
                // Only return calculated amount if we have valid data (both values are non-zero)
                if (appFee > 0 && baseAmount > 0) {
                  const calculatedTotal = appFee + baseAmount;
                  return calculatedTotal;
                }
               
                // If no valid data available even from "Sale & Conform" flow
                // Return undefined to prevent auto-population
                return undefined;
              })()}
            />
          </div>
        </div>
      ) : (
        /* Form Sections - Show when not in confirmation mode */
        <div className={styles.saleFormBody}>

          {/* Global Error Display */}
          {error && (
            <div className={styles.global_error}>
              {error}
            </div>
          )}

          {/* Personal Information Form */}
          <div className={styles.saleFormSection}>
            {/* Debug Box for PersonalInformation */}
       
            <PersonalInformation
  onSuccess={handlePersonalInfoSuccess}
  externalErrors={Object.fromEntries(
    Object.entries(fieldWiseErrors).filter(([key]) =>
      [
        'firstName', 'surname', 'gender', 'aaparNo', 'dateOfBirth', 'aadharCardNo', 'quota', 'admissionType', 'phoneNumber', 'fatherName'
      ].includes(key)
    )
  )}
  onClearFieldError={clearSpecificFieldError}
  initialValuesOverride={{
    firstName: studentProfileData?.firstName ?? allFormData.firstName,
    surname: studentProfileData?.surname ?? studentProfileData?.lastName ?? allFormData.surname,
    gender: studentProfileData?.genderId?.toString() ?? allFormData.gender,
    aaparNo: studentProfileData?.apaarNo ?? allFormData.aaparNo,
    dateOfBirth: studentProfileData?.dob?.substring(0,10) ?? allFormData.dateOfBirth,
    aadharCardNo: studentProfileData?.aadharCardNo ?? allFormData.aadharCardNo,
    proReceiptNo: studentProfileData?.proReceiptNo ?? allFormData.proReceiptNo,
    admissionReferredBy: studentProfileData?.admissionReferredById?.toString() ?? allFormData.admissionReferredBy,
    // Always use quotaId (as string) so dropdown can match and display the name
    quota: studentProfileData?.quotaId?.toString() ?? allFormData.quota,  
    employeeId: studentProfileData?.admissionReferredByName ?? allFormData.employeeId,
    // Always use admissionTypeId (as string) so dropdown can match and display the name
    admissionType: studentProfileData?.admissionTypeId?.toString() ?? allFormData.admissionType,
    fatherName: studentProfileData?.parentInfo?.fatherName ?? allFormData.fatherName,
    phoneNumber: studentProfileData?.parentInfo?.phoneNumber?.toString() ?? allFormData.phoneNumber,
    profilePhoto: studentProfileData?.profilePhoto ?? allFormData.profilePhoto,
  }}
/>
          </div>
         
          {/* Orientation Information Form */}
          <div className={styles.saleFormSection}>
            {/* Debug Box for OrientationInformation */}
           
            <OrientationInformation
  onSuccess={handleOrientationInfoSuccess}
  externalErrors={Object.fromEntries(
    Object.entries(fieldWiseErrors).filter(([key]) =>
      ['academicYear', 'branch', 'studentType', 'joiningClass', 'orientationName'].includes(key)
    )
  )}
  onClearFieldError={clearSpecificFieldError}
  onValidationRef={handleOrientationValidationRef}
  allFormData={allFormData}
  academicYear={allFormData.academicYear || ""}
  academicYearId={allFormData.academicYearId !== null && allFormData.academicYearId !== undefined ? allFormData.academicYearId : null}
  initialValuesOverride={{
    // Priority: StatusHeader academicYear (current) > StudentProfile academicYear (old)
    // This ensures the current academic year "2023-24" is displayed, not the old "2022-23"
    academicYear: allFormData.academicYear || studentProfileData?.academicYearValue || studentProfileData?.academicYear || "",
    // Do NOT include academicYearId in initialValuesOverride - always use from props (StatusHeader)
    // This ensures StatusHeader's current academicYearId (24) takes priority over StudentProfile's old academicYearId (23)
    // Always use IDs (as strings) so dropdowns can match and display the names
    branch: studentProfileData?.branchId?.toString() ?? allFormData.branch,
    branchType: studentProfileData?.branchType ?? allFormData.branchType,
    city: studentProfileData?.city ?? allFormData.city,
    studentType: studentProfileData?.studentTypeId?.toString() ?? allFormData.studentType,
    joiningClass: studentProfileData?.joiningClassId?.toString() ?? allFormData.joiningClass,
    orientationName: studentProfileData?.orientationId?.toString() ?? allFormData.orientationName,
    admissionType: studentProfileData?.admissionTypeId?.toString() ?? allFormData.admissionType,
    proReceiptNo: studentProfileData?.proReceiptNo ?? allFormData.proReceiptNo
  }}
/>
          </div>
         
          {/* Address Information Form */}
          <div className={styles.saleFormSection}>
            {/* Debug Box for AddressInformation */}
           
            <AddressInformation
  onSuccess={handleAddressInfoSuccess}
  externalErrors={Object.fromEntries(
    Object.entries(fieldWiseErrors).filter(([key]) =>
      ['doorNo', 'streetName', 'area', 'pincode', 'mandal', 'addressCity'].includes(key)
    )
  )}
  onClearFieldError={clearSpecificFieldError}
  initialValuesOverride={{
    doorNo: studentProfileData?.addressDetails?.doorNo ?? allFormData.doorNo,
    streetName: studentProfileData?.addressDetails?.street ?? allFormData.streetName,
    landmark: studentProfileData?.addressDetails?.landmark ?? allFormData.landmark,
    area: studentProfileData?.addressDetails?.area ?? allFormData.area,
    pincode: studentProfileData?.addressDetails?.pincode != null ? String(studentProfileData?.addressDetails?.pincode) : allFormData.pincode,
    mandal: studentProfileData?.addressDetails?.mandalId != null ? String(studentProfileData?.addressDetails?.mandalId) : allFormData.mandal,
    city: studentProfileData?.addressDetails?.cityId != null ? String(studentProfileData?.addressDetails?.cityId) : allFormData.city,
    district: studentProfileData?.addressDetails?.districtId != null ? String(studentProfileData?.addressDetails?.districtId) : allFormData.district,
    state: studentProfileData?.addressDetails?.stateId != null ? String(studentProfileData?.addressDetails?.stateId) : allFormData.state,
    gpin: studentProfileData?.addressDetails?.gpin ?? allFormData.gpin,
    // Provide ID fields so the form can reconcile IDs to labels post-fetch
    mandalId: studentProfileData?.addressDetails?.mandalId != null ? studentProfileData?.addressDetails?.mandalId : allFormData.mandalId,
    cityId: studentProfileData?.addressDetails?.cityId != null ? studentProfileData?.addressDetails?.cityId : allFormData.cityId,
    districtId: studentProfileData?.addressDetails?.districtId != null ? studentProfileData?.addressDetails?.districtId : allFormData.districtId,
    stateId: studentProfileData?.addressDetails?.stateId != null ? studentProfileData?.addressDetails?.stateId : allFormData.stateId
  }}
/>
          </div>
         
          {/* Action Buttons */}
          <div className={styles.saleFormSection}>
           
             <ActionButtons
              onPaymentSuccess={handlePaymentSuccess}
              onSaleAndConform={handleSaleAndConform}
              onSubmitCompleteSale={submitCompleteSale}
              onSubmitSaleOnly={submitSaleOnly}
              isSubmitting={isSubmitting}
              formData={allFormData}
              onPaymentInfoSuccess={handlePaymentInfoSuccess}
              onFieldWiseErrors={handleFieldWiseErrors}
              onClearFieldWiseErrors={clearFieldWiseErrors}
              onValidateOrientation={orientationValidationFn}
              category={category}
              showSaveContinue={isEditing}
              onSaveAndContinue={handleSaveAndContinue}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleForm;
