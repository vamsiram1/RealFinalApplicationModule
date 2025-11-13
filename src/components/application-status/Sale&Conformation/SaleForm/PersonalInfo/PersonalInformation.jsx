import { Formik, Form, Field } from "formik";
import React, { useEffect, useState } from "react";
import Inputbox from "../../../../../widgets/Inputbox/InputBox";
import { formFields, initialValues } from "./constants/formFields";
import { validationSchema } from "./constants/validationSchema";
import { usePersonalInfoSubmission } from "./hooks/usePersonalInfoSubmission";
import { useDropdownData } from "./hooks/useDropdownData";
import BasicInfo from "./components/BasicInfo";
import DownSection from "./components/DownSection";
import ProfilePhoto from "./components/ProfilePhoto";
import AdditionalFields from "./components/AdditionalFields";
import ParentInfo from "./components/ParentInfo";
import styles from "./PersonalInformation.module.css";

const PersonalInformation = ({ onSuccess, externalErrors = {}, onClearFieldError, initialValuesOverride }) => {
  const { isSubmitting, error, handleSubmit } = usePersonalInfoSubmission();
  const { 
    quotaOptions, 
    admissionReferredByOptions, 
    admissionTypeOptions,
    genderOptions,
    authorizedByOptions,
    loading: dropdownLoading, 
    error: dropdownError 
  } = useDropdownData();

  // Track previous values to detect changes
  const [previousValues, setPreviousValues] = useState(initialValues);
  // Track if form has been submitted to show validation errors
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Use ref to store onSuccess callback to avoid dependency issues
  const onSuccessRef = React.useRef(onSuccess);
  React.useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // Force update parent with current values whenever admissionType changes
  useEffect(() => {
    if (onSuccessRef.current && previousValues.admissionType !== undefined) {
      onSuccessRef.current(previousValues);
    }
  }, [previousValues.admissionType]);

  // Custom validation function for conditional fields
  const customValidate = (values) => {
    const errors = {};

    // Validate date of birth
    if (!values.dateOfBirth) {
      errors.dateOfBirth = 'Date of Birth is required';
    } else {
      // Check if date is in the future
      const today = new Date();
      const birthDate = new Date(values.dateOfBirth);
      if (birthDate > today) {
        errors.dateOfBirth = 'Date of Birth cannot be in the future';
      } else {
        // Check age (must be at least 5 years)
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        // If birthday hasn't occurred this year, subtract 1
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 5) {
          errors.dateOfBirth = 'Age must be at least 5 years';
        }
      }
    }

    // Check if employeeId should be required (when Staff children quota is selected)
    const selectedQuotaOption = quotaOptions.find(option => 
      String(option.value) === String(values.quota) || option.value == values.quota
    );
    const isStaffChildSelected = selectedQuotaOption?.label === "Staff children";
    
    if (isStaffChildSelected && !values.employeeId) {
      errors.employeeId = "Employee ID is required when Staff children quota is selected";
    }

    // Check if proReceiptNo should be required (when "with pro" admission type is selected)
    const selectedAdmissionTypeOption = admissionTypeOptions.find(option => 
      String(option.value) === String(values.admissionType) || option.value == values.admissionType
    );
    const selectedAdmissionTypeLabel = selectedAdmissionTypeOption?.label;
    
    const isWithProSelected = selectedAdmissionTypeLabel === "with pro" || 
                              selectedAdmissionTypeLabel === "With Pro" || 
                              selectedAdmissionTypeLabel === "With pro";
    const category = localStorage.getItem("category");
    const isCollegeCategory = category === "COLLEGE";
    
    // Only require PRO Receipt No if "with pro" is selected AND category is not COLLEGE
    if (isWithProSelected && !isCollegeCategory && !values.proReceiptNo) {
      errors.proReceiptNo = "PRO Receipt No is required when admission type is 'with pro'";
    }

    return errors;
  };

  // Function to handle value changes
  const handleValuesChange = (values) => {
    // Check if values have actually changed
    const hasChanged = JSON.stringify(values) !== JSON.stringify(previousValues);
    if (hasChanged && onSuccess) {
      onSuccess(values);
      setPreviousValues(values);
    }
  };

  // Handle form submission with API integration
  const onSubmit = async (values, { setSubmitting }) => {
    // Set submitted state to show validation errors
    setIsSubmitted(true);
    
    try {
      // Just validate and pass data to parent (matching existing pattern)
      if (onSuccess) {
        onSuccess(values);
      }
      
      setSubmitting(false);
      return { success: true };
    } catch (err) {
      setSubmitting(false);
      return { success: false, error: err.message };
    }
  };

  // Show error state if dropdown data fails to load (but still render the form)
  if (dropdownError) {
    // Dropdown data failed to load, but continue rendering the form
  }

  return (
    <Formik
      initialValues={{
        ...initialValues,
        ...(initialValuesOverride || {})
      }}
      validationSchema={validationSchema}
      validate={customValidate}
      validateOnBlur={true}
      validateOnChange={true}
      validateOnSubmit={true}
      onSubmit={onSubmit}
    >
      {({ values, errors, touched, setFieldValue, setFieldTouched, handleChange, handleBlur }) => {
        // Pass data to parent whenever values change
        handleValuesChange(values);

        return (
        <Form>
          {/* Debug Box for PersonalInformation */}

          {/* Global Error Display */}
          {error && (
            <div className={styles.global_error}>
              {error}
            </div>
          )}


          {/* Personal Information Section Title - Full Width */}
          <div className={`${styles.personal_info_section_general_field_label_wrapper} ${styles.personal_info_full_width}`}>
            <span className={styles.personal_info_section_general_field_label}>
              Personal Information
            </span>
            <div className={styles.personal_info_section_general_line}></div>
          </div>

    <div className={styles.custom_flex_container}>
            {/* Left Side - Two divs (up and down) */}
      <div className={styles.custom_left_group}>
        {/* UP DIV - First Name and Surname */}
              <BasicInfo
                values={values}
                handleChange={handleChange}
                handleBlur={handleBlur}
                touched={touched}
                errors={errors}
                admissionReferredByOptions={admissionReferredByOptions}
                quotaOptions={quotaOptions}
                admissionTypeOptions={admissionTypeOptions}
                genderOptions={genderOptions}
                authorizedByOptions={authorizedByOptions}
                formFields={formFields}
                setFieldValue={setFieldValue}
                isSubmitted={isSubmitted}
                externalErrors={externalErrors}
                onClearFieldError={onClearFieldError}
              />

              {/* DOWN DIV - Gender and Aapar No */}
              <DownSection
                values={values}
                handleChange={handleChange}
                handleBlur={handleBlur}
                touched={touched}
                errors={errors}
                setFieldValue={setFieldValue}
                setFieldTouched={setFieldTouched}
                formFields={formFields}
                genderOptions={genderOptions}
                isSubmitted={isSubmitted}
                externalErrors={externalErrors}
                onClearFieldError={onClearFieldError}
              />
      </div>
      
            {/* Right Side - Profile Photo */}
            <div className={styles.custom_right_group}>
              <ProfilePhoto
                touched={touched}
                errors={errors}
                isSubmitted={isSubmitted}
              />
            </div>
          </div>

          {/* Additional Fields */}
          <AdditionalFields
            values={values}
            handleChange={handleChange}
            handleBlur={handleBlur}
            touched={touched}
            errors={errors}
            admissionReferredByOptions={admissionReferredByOptions}
            quotaOptions={quotaOptions}
            admissionTypeOptions={admissionTypeOptions}
            genderOptions={genderOptions}
            authorizedByOptions={authorizedByOptions}
            formFields={formFields}
            setFieldValue={setFieldValue}
            isSubmitted={isSubmitted}
            externalErrors={externalErrors}
            onClearFieldError={onClearFieldError}
          />

          {/* Parent Information */}
          <ParentInfo
            values={values}
            handleChange={handleChange}
            handleBlur={handleBlur}
            touched={touched}
            errors={errors}
            admissionReferredByOptions={admissionReferredByOptions}
            quotaOptions={quotaOptions}
            formFields={formFields}
            setFieldValue={setFieldValue}
            isSubmitted={isSubmitted}
            externalErrors={externalErrors}
            onClearFieldError={onClearFieldError}
          />
        </Form>
        );
      }}
    </Formik>
  );
};

export default PersonalInformation;