import { Formik, Form } from "formik";
import { useState, useEffect, useCallback, useMemo } from "react";
import { formFields, initialValues } from "./constants/orientationConstants";
import { validationSchema } from "./constants/validationSchema";
import { useOrientationSubmission } from "./hooks/useOrientationSubmission";
import OrientationFormTitle from "./components/OrientationFormTitle";
import OrientationFormGrid from "./components/OrientationFormGrid";
import styles from "./OrientationInformation.module.css";

const OrientationInformation = ({ onSuccess, externalErrors = {}, onClearFieldError, onValidationRef, allFormData, academicYear, academicYearId, initialValuesOverride }) => {
  const { isSubmitting, error, handleSubmit } = useOrientationSubmission();

  // Track previous values to detect changes
  const [previousValues, setPreviousValues] = useState(initialValues);

  // Enhanced initial values with data from props (StatusHeader API response takes priority)
  // Use useMemo to recalculate when critical props change - this ensures Formik's enableReinitialize works properly
  // NOTE: We only depend on academicYear and academicYearId to avoid infinite re-renders.
  // initialValuesOverride is used but not in dependencies since it's recreated on every render.
  const enhancedInitialValues = useMemo(() => {
    // Priority: Props (from StatusHeader) > initialValuesOverride > initialValues
    // Do NOT use localStorage for academicYearId - always use from StatusHeader API
    const finalAcademicYear = academicYear || initialValuesOverride?.academicYear || initialValues.academicYear;
    const finalAcademicYearId = academicYearId !== null && academicYearId !== undefined 
      ? academicYearId 
      : (initialValuesOverride?.academicYearId || null);
    
    return {
      ...initialValues,
      ...(initialValuesOverride || {}),
      academicYear: finalAcademicYear,
      // Always use academicYearId from props (StatusHeader API) - highest priority
      academicYearId: finalAcademicYearId
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear, academicYearId]); // Only depend on StatusHeader values to prevent infinite re-renders

  // Custom validation function for conditional fields
  const customValidate = (values) => {
    const errors = {};

    // Check if proReceiptNo should be required (when admission type includes "pro")
    if (values.admissionType && 
        (values.admissionType.toLowerCase().includes("pro") || 
         values.admissionType.toLowerCase().includes("with pro")) &&
        !values.proReceiptNo) {
      errors.proReceiptNo = "PRO Receipt No is required when admission type includes 'pro'";
    }

    return errors;
  };

  // Function to handle value changes
  const handleValuesChange = (values) => {
    // Check if values have actually changed
    const hasChanged = JSON.stringify(values) !== JSON.stringify(previousValues);
    if (hasChanged && onSuccess) {
      // Include academicYearId in the values passed back to parent
      // Priority: Props (StatusHeader) > enhancedInitialValues
      const valuesWithId = {
        ...values,
        academicYear: academicYear || values.academicYear, // Ensure StatusHeader academicYear is used
        academicYearId: academicYearId !== null && academicYearId !== undefined 
          ? academicYearId 
          : enhancedInitialValues.academicYearId
      };
      onSuccess(valuesWithId);
      setPreviousValues(values);
    }
  };

  // Handle form submission with API integration
  const onSubmit = async (values, { setSubmitting }) => {
    
    try {
      // Just validate and pass data to parent (matching existing pattern)
      if (onSuccess) {
        // Include academicYearId in the values passed back to parent
        // Priority: Props (StatusHeader) > enhancedInitialValues
        const valuesWithId = {
          ...values,
          academicYear: academicYear || values.academicYear, // Ensure StatusHeader academicYear is used
          academicYearId: academicYearId !== null && academicYearId !== undefined 
            ? academicYearId 
            : enhancedInitialValues.academicYearId
        };
        onSuccess(valuesWithId);
      }
      
      setSubmitting(false);
      return { success: true };
    } catch (err) {
      setSubmitting(false);
      return { success: false, error: err.message };
    }
  };

  // Function to validate orientation form and return errors
  const validateOrientationForm = useCallback(async () => {
    // Get current form values from the form data
    const currentValues = {
      academicYear: allFormData.academicYear || enhancedInitialValues.academicYear,
      branch: allFormData.branch || enhancedInitialValues.branch,
      branchType: allFormData.branchType || enhancedInitialValues.branchType,
      city: allFormData.city || enhancedInitialValues.city,
      studentType: allFormData.studentType || enhancedInitialValues.studentType,
      joiningClass: allFormData.joiningClass || enhancedInitialValues.joiningClass,
      orientationName: allFormData.orientationName || enhancedInitialValues.orientationName,
      admissionType: allFormData.admissionType || enhancedInitialValues.admissionType,
      proReceiptNo: allFormData.proReceiptNo || enhancedInitialValues.proReceiptNo
    };
    
    try {
      // Validate using the same schema as Formik
      await validationSchema.validate(currentValues, { abortEarly: false });
      return {}; // No errors
    } catch (error) {
      const errors = {};
      if (error.inner) {
        error.inner.forEach(err => {
          errors[err.path] = err.message;
        });
      }
      return errors;
    }
  }, [allFormData, enhancedInitialValues]);

  // Pass validation function to parent
  useEffect(() => {
    if (onValidationRef) {
      onValidationRef(validateOrientationForm);
    }
  }, [onValidationRef, validateOrientationForm]);

  return (
    <Formik
      initialValues={enhancedInitialValues}
      enableReinitialize={true} // Allow form to reinitialize when initialValues change
      validationSchema={validationSchema}
      validate={customValidate}
      validateOnBlur={true}
      validateOnChange={false}
      onSubmit={onSubmit}
    >
      {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => {
        // Pass data to parent whenever values change
        handleValuesChange(values);

        return (
        <Form>

          {/* Global Error Display */}
          {error && (
            <div className={styles.global_error}>
              {error}
            </div>
          )}

          {/* Orientation Information Section Title */}
          <OrientationFormTitle />

          {/* Form Grid */}
          <OrientationFormGrid
            formFields={formFields}
            values={values}
            handleChange={handleChange}
            handleBlur={handleBlur}
            errors={errors}
            touched={touched}
            setFieldValue={setFieldValue}
            isSubmitting={isSubmitting}
            externalErrors={externalErrors}
            onClearFieldError={onClearFieldError}
          />
        </Form>
        );
      }}
    </Formik>
  );
};

export default OrientationInformation;
