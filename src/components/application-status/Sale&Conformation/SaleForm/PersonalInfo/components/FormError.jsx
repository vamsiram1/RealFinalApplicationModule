import React from 'react';

const FormError = ({ name, touched, errors, className, showOnChange = false, isSubmitted = false, externalErrors = {} }) => {
  // Show error if field is touched AND has error
  // OR if showOnChange is true AND field has error (for immediate validation)
  // OR if form is submitted AND field has error (for submission validation)
  // OR if external error exists for this field (for external validation)
  const shouldShowError = (touched[name] && errors[name]) || 
                         (showOnChange && errors[name]) || 
                         (isSubmitted && errors[name]) ||
                         (externalErrors[name]);
  
  // Priority: external error > formik error
  const errorMessage = externalErrors[name] || errors[name];
  
  if (!shouldShowError) {
    return null;
  }
  
  return (
    <div className={className}>
      {errorMessage}
    </div>
  );
};

export default FormError;
