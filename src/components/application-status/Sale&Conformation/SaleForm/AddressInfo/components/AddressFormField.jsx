import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Field } from 'formik';
import Inputbox from '../../../../../../widgets/Inputbox/InputBox';
import Dropdown from '../../../../../../widgets/Dropdown/Dropdown';
import SearchBox from '../../../../../../widgets/Searchbox/Searchbox';
import Snackbar from '../../../../../../widgets/Snackbar/Snackbar';
import FormError from './FormError';
import { ReactComponent as SearchIcon } from '../../../../../../assets/application-status/Group.svg';
import { saleApi } from '../../services/saleApi';
import styles from './AddressFormField.module.css';

// Debug flag for conditional logging
const DEBUG = process.env.NODE_ENV === 'development';

const AddressFormField = ({ field, values, handleChange, handleBlur, errors, touched, setFieldValue, externalErrors, onClearFieldError }) => {
  // Combined state for better performance
  const [dropdownState, setDropdownState] = useState({
    stateOptions: [],
    districtOptions: [],
    mandalOptions: [
      { value: "mandal1", label: "Mandal 1" },
      { value: "mandal2", label: "Mandal 2" },
      { value: "mandal3", label: "Mandal 3" }
    ],
    cityOptions: [
      { value: "city1", label: "City 1" },
      { value: "city2", label: "City 2" },
      { value: "city3", label: "City 3" }
    ],
    loading: false,
    mandalRenderKey: 0,
    cityRenderKey: 0
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error'
  });

  useEffect(() => {
    // Only run on initial mount
    if (field.name === "pincode") {
      const val = values.pincode;
      if (val && val.length === 6) {
        fetchStateDistrictByPincode(val);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  

// Auto-trigger fetch for mandals/cities on first render if data is present
useEffect(() => {
  if (field.name === 'mandal' && values.districtId && values.mandal) {
    fetchMandalsByDistrict(values.districtId);
  }
}, [field.name, values.districtId, values.mandal]);

useEffect(() => {
  if (field.name === 'city' && values.districtId && values.city) {
    fetchCitiesByDistrict(values.districtId);
  }
}, [field.name, values.districtId, values.city]);
  // Destructure for easier access
  const { stateOptions, districtOptions, mandalOptions, cityOptions, loading, mandalRenderKey, cityRenderKey } = dropdownState;

  // Force re-render when mandal options change
  useEffect(() => {
    if (mandalOptions.length > 0) {
      setDropdownState(prev => ({ ...prev, mandalRenderKey: prev.mandalRenderKey + 1 }));
    }
  }, [mandalOptions.length]);

  // Force re-render when district changes (for mandal and city fields)
  useEffect(() => {
    if (field.name === "mandal") {
      if (values.district && values.districtId) {
        // Trigger both state update and re-render
        fetchMandalsByDistrict(values.districtId);
        setDropdownState(prev => ({ ...prev, mandalRenderKey: prev.mandalRenderKey + 1 }));
      } else if (!values.district || !values.districtId) {
        // Clear mandal options when district is cleared
        setDropdownState(prev => ({ ...prev, mandalOptions: [] }));
        setFieldValue('mandal', '');
        setFieldValue('mandalId', '');
        setDropdownState(prev => ({ ...prev, mandalRenderKey: prev.mandalRenderKey + 1 }));
      }
    } else if (field.name === "city") {
      if (values.district && values.districtId) {
        // Trigger both state update and re-render
        fetchCitiesByDistrict(values.districtId);
        setDropdownState(prev => ({ ...prev, cityRenderKey: prev.cityRenderKey + 1 }));
      } else if (!values.district || !values.districtId) {
        // Clear city options when district is cleared
        setDropdownState(prev => ({ ...prev, cityOptions: [] }));
        setFieldValue('city', '');
        setFieldValue('cityId', '');
        setDropdownState(prev => ({ ...prev, cityRenderKey: prev.cityRenderKey + 1 }));
      }
    }
  }, [values.district, values.districtId, field.name]);

  // Function to show snackbar - optimized with useCallback
  const showSnackbar = useCallback((message, severity = 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

  // Function to close snackbar - optimized with useCallback
  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  }, []);

  // API call to fetch state and district by pincode
  const fetchStateDistrictByPincode = async (pincode) => {
    if (!pincode || pincode.length < 6) {
      return;
    }

    // Check if setFieldValue is available
    if (!setFieldValue) {
      return;
    }

    setDropdownState(prev => ({ ...prev, loading: true }));
    try {
      const data = await saleApi.getStateDistrictByPincode(pincode);
      
      if (data) {
        // Check if we got valid state and district data
        if (data.stateName && data.stateId && data.districtName && data.districtId) {
          // Update state options
          const stateOption = [{
            value: data.stateId,
            label: data.stateName
          }];
          setDropdownState(prev => ({ ...prev, stateOptions: stateOption }));
          setFieldValue('state', data.stateName);
          setFieldValue('stateId', data.stateId);

          // Update district options
          const districtOption = [{
            value: data.districtId,
            label: data.districtName
          }];
          setDropdownState(prev => ({ ...prev, districtOptions: districtOption }));
          setFieldValue('district', data.districtName);
          setFieldValue('districtId', data.districtId);

          // Clear mandal options and fetch mandals for the district
          setDropdownState(prev => ({ ...prev, mandalOptions: [] }));
          setFieldValue('mandal', '');
          setFieldValue('mandalId', '');
          
          // Fetch mandals for the auto-populated district
          await fetchMandalsByDistrict(data.districtId);

          // Show success message
          showSnackbar(`State: ${data.stateName}, District: ${data.districtName}`, 'success');
        } else {
          // Show polite error if data is incomplete
          showSnackbar('Please enter a valid 6-digit pincode to get location details.', 'warning');
          // Clear state and district
          setDropdownState(prev => ({ ...prev, stateOptions: [] }));
          setDropdownState(prev => ({ ...prev, districtOptions: [] }));
          setFieldValue('state', '');
          setFieldValue('stateId', '');
          setFieldValue('district', '');
          setFieldValue('districtId', '');
        }
      } else {
        // Show polite error if no data received
        showSnackbar('Sorry, we couldn\'t find location details for this pincode. Please verify and try again.', 'warning');
        // Clear state and district
        setDropdownState(prev => ({ ...prev, stateOptions: [] }));
        setDropdownState(prev => ({ ...prev, districtOptions: [] }));
        setFieldValue('state', '');
        setFieldValue('stateId', '');
        setFieldValue('district', '');
        setFieldValue('districtId', '');
      }
    } catch (error) {
      // Check for specific error types and show appropriate polite messages
      if (error.response?.status === 500) {
        showSnackbar('Our servers are temporarily experiencing issues. Please try again in a few moments.', 'error');
      } else if (error.response?.status === 404) {
        showSnackbar('Sorry, we couldn\'t find location details for this pincode. Please verify and try again.', 'warning');
      } else if (error.response?.status === 400) {
        showSnackbar('Please enter a valid 6-digit pincode to get location details.', 'warning');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        showSnackbar('Unable to connect to our servers. Please check your internet connection and try again.', 'error');
      } else {
        showSnackbar('Unable to fetch location details at the moment. Please try again later.', 'error');
      }
      
      // Clear state and district on error
      setDropdownState(prev => ({ ...prev, stateOptions: [] }));
      setDropdownState(prev => ({ ...prev, districtOptions: [] }));
      setFieldValue('state', '');
      setFieldValue('stateId', '');
      setFieldValue('district', '');
      setFieldValue('districtId', '');
    } finally {
      setDropdownState(prev => ({ ...prev, loading: false }));
    }
  };

  // API call to fetch mandals by district
  const fetchMandalsByDistrict = async (districtId) => {
    if (!districtId) {
      return;
    }


    // Check if setFieldValue is available
    if (!setFieldValue) {
      return;
    }

    setDropdownState(prev => ({ ...prev, loading: true }));
    try {
      const data = await saleApi.getMandalsByDistrict(districtId);

      // Handle different response formats
      let mandalsArray = [];
      if (Array.isArray(data)) {
        mandalsArray = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        mandalsArray = data.data;
      } else if (data && data.mandals && Array.isArray(data.mandals)) {
        mandalsArray = data.mandals;
      } else if (data && data.result && Array.isArray(data.result)) {
        mandalsArray = data.result;
      }

      if (mandalsArray.length > 0) {
        const transformedOptions = mandalsArray.map(item => ({
          value: item.id, // Use the actual ID from API response
          label: item.name // Use the actual name from API response
        }));
        setDropdownState(prev => ({ ...prev, mandalOptions: transformedOptions }));
        // If we already have a mandalId from initial values, map it to label for visible value
        if (values.mandalId != null && values.mandalId !== '' && (!values.mandal || values.mandal === String(values.mandalId))) {
          const match = transformedOptions.find(opt => String(opt.value) === String(values.mandalId));
          if (match) {
            setFieldValue('mandal', match.label);
          }
        }
      } else {
        setDropdownState(prev => ({ ...prev, mandalOptions: [] }));
        setFieldValue('mandal', '');
        setFieldValue('mandalId', '');
      }
    } catch (error) {
      // Check for specific error types and show appropriate polite messages
      if (error.response?.status === 500) {
        showSnackbar('Our servers are temporarily experiencing issues. Please try again in a few moments.', 'error');
      } else if (error.response?.status === 404) {
        showSnackbar('No mandals found for this district.', 'warning');
      } else if (error.response?.status === 400) {
        showSnackbar('Invalid district information. Please try again.', 'warning');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        showSnackbar('Unable to connect to our servers. Please check your internet connection and try again.', 'error');
      } else {
        showSnackbar('Unable to fetch mandals at the moment. Please try again later.', 'error');
      }
      
      setDropdownState(prev => ({ ...prev, mandalOptions: [] }));
      setFieldValue('mandal', '');
      setFieldValue('mandalId', '');
    } finally {
      setDropdownState(prev => ({ ...prev, loading: false }));
    }
  };

  // API call to fetch cities by district
  const fetchCitiesByDistrict = async (districtId) => {
    if (!districtId) {
      return;
    }


    // Check if setFieldValue is available
    if (!setFieldValue) {
      return;
    }

    setDropdownState(prev => ({ ...prev, loading: true }));
    try {
      const data = await saleApi.getCitiesByDistrict(districtId);

      // Handle different response formats
      let citiesArray = [];
      if (Array.isArray(data)) {
        citiesArray = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        citiesArray = data.data;
      } else if (data && data.cities && Array.isArray(data.cities)) {
        citiesArray = data.cities;
      } else if (data && data.result && Array.isArray(data.result)) {
        citiesArray = data.result;
      }

      if (citiesArray.length > 0) {
        const transformedOptions = citiesArray.map(item => ({
          value: item.id, // Use the actual ID from API response
          label: item.name // Use the actual name from API response
        }));
        setDropdownState(prev => ({ ...prev, cityOptions: transformedOptions }));
        // If we already have a cityId from initial values, map it to label for visible value
        if (values.cityId != null && values.cityId !== '' && (!values.city || values.city === String(values.cityId))) {
          const match = transformedOptions.find(opt => String(opt.value) === String(values.cityId));
          if (match) {
            setFieldValue('city', match.label);
          }
        }
      } else {
        setDropdownState(prev => ({ ...prev, cityOptions: [] }));
        setFieldValue('city', '');
        setFieldValue('cityId', '');
      }
    } catch (error) {
      // Check for specific error types and show appropriate polite messages
      if (error.response?.status === 500) {
        showSnackbar('Our servers are temporarily experiencing issues. Please try again in a few moments.', 'error');
      } else if (error.response?.status === 404) {
        showSnackbar('No cities found for this district.', 'warning');
      } else if (error.response?.status === 400) {
        showSnackbar('Invalid district information. Please try again.', 'warning');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        showSnackbar('Unable to connect to our servers. Please check your internet connection and try again.', 'error');
      } else {
        showSnackbar('Unable to fetch cities at the moment. Please try again later.', 'error');
      }
      
      setDropdownState(prev => ({ ...prev, cityOptions: [] }));
      setFieldValue('city', '');
      setFieldValue('cityId', '');
    } finally {
      setDropdownState(prev => ({ ...prev, loading: false }));
    }
  };

  // Custom handler for pincode field to filter non-numeric input
  const handlePincodeInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear external error for this field when user starts typing
    if (onClearFieldError && externalErrors[name]) {
      onClearFieldError(name);
    }
    
    // Filter out everything except numbers
    const filteredValue = value.replace(/[^0-9]/g, '');
    
    // Limit to 6 digits
    const limitedValue = filteredValue.slice(0, 6);
    
    // Use Formik's setFieldValue to update the field
    if (setFieldValue) {
      setFieldValue(name, limitedValue);
    } else {
      // Fallback to regular handleChange with filtered value
      handleChange({
        ...e,
        target: {
          ...e.target,
          value: limitedValue
        }
      });
    }
    
    // Trigger API call when pincode is 6 digits
    if (limitedValue.length === 6) {
      fetchStateDistrictByPincode(limitedValue);
    } else if (limitedValue.length < 6) {
      // Clear state and district if pincode is incomplete
      setDropdownState(prev => ({ ...prev, stateOptions: [] }));
      setDropdownState(prev => ({ ...prev, districtOptions: [] }));
      setFieldValue('state', '');
      setFieldValue('stateId', '');
      setFieldValue('district', '');
      setFieldValue('districtId', '');
    }
  };

  // Custom handler for text fields to filter special characters
  const handleTextInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear external error for this field when user starts typing
    if (onClearFieldError && externalErrors[name]) {
      onClearFieldError(name);
    }
    
    // Allow letters, numbers, spaces, hyphens, periods, and common address characters
    const filteredValue = value.replace(/[^A-Za-z0-9\s\-\.\/\\#]/g, '');
    
    // Use Formik's setFieldValue to update the field
    if (setFieldValue) {
      setFieldValue(name, filteredValue);
    } else {
      // Fallback to regular handleChange with filtered value
      handleChange({
        ...e,
        target: {
          ...e.target,
          value: filteredValue
        }
      });
    }
  };

  // Handle mandal change to store ID
  const handleMandalChange = (e) => {
    // Clear external error for this field when user selects an option
    if (onClearFieldError && externalErrors[field.name]) {
      onClearFieldError(field.name);
    }
    
    handleChange(e);
    if (field.name === "mandal") {
      // Find the selected option to get both label and ID
      const selectedOption = mandalOptions.find(option => option.label === e.target.value);
      if (selectedOption) {
        setFieldValue('mandalId', selectedOption.value);
        if (DEBUG) {
        }
      } else {
        setFieldValue('mandalId', '');
      }
    }
  };

  // Handle city change to store ID
  const handleCityChange = (e) => {
    // Clear external error for this field when user selects an option
    if (onClearFieldError && (externalErrors[field.name] || externalErrors.addressCity)) {
      onClearFieldError(field.name === 'city' ? 'addressCity' : field.name);
    }
    
    if (field.name === "city") {
      // Find the selected option to get both label and ID
      const selectedOption = cityOptions.find(option => 
        option.label === e.target.value ||
        String(option.value) === String(e.target.value) ||
        option.value == e.target.value
      );
      
      if (selectedOption) {
        // Store the label in city field (for display)
        setFieldValue('city', selectedOption.label);
        // Store the ID in cityId field (for backend)
        setFieldValue('cityId', selectedOption.value);
        console.log('✅ City changed - storing label and ID:', { 
          city: selectedOption.label, 
          cityId: selectedOption.value 
        });
      } else {
        setFieldValue('city', '');
        setFieldValue('cityId', '');
      }
    } else {
      handleChange(e);
    }
  };

  // Optimized options mapping with useMemo
  const optionsMap = useMemo(() => ({
    "stateOptions": stateOptions,
    "districtOptions": districtOptions,
    "mandalOptions": mandalOptions,
    "cityOptions": cityOptions
  }), [stateOptions, districtOptions, mandalOptions, cityOptions]);

  const getOptions = useCallback((optionsKey) => {
    return optionsMap[optionsKey] || [];
  }, [optionsMap]);

  return (
    <>
    <div className={styles.address_info_form_field}>
      <Field name={field.name}>
        {({ field: fieldProps, meta }) => {
          const options = getOptions(field.options);
          const stringOptions = options.map(option => option.label || option.value);
          
          // Debug logging for mandal and city dropdowns
          if (field.name === "mandal" || field.name === "city") {
            // Debug information available if needed
          }

          // For State and District, render as read-only input fields instead of dropdowns
          if (field.name === "state" || field.name === "district") {
            return (
              <Inputbox
                label={field.label}
                id={field.id}
                name={field.name}
                placeholder={field.placeholder}
                value={values[field.name] || ""}
                onChange={() => {}} // No-op function to prevent any changes
                onBlur={handleBlur}
                type="text"
                error={meta.touched && meta.error}
                required={field.required}
                readOnly={true}
                disabled={true} // Make it completely non-editable
              />
            );
          }

          if (field.type === "dropdown") {
            // For city field, ensure we display the label instead of ID
            let displayValue = values[field.name] || "";
            
            if (field.name === "city") {
              // If city value is an ID (numeric string), find the matching label
              if (displayValue && /^\d+$/.test(String(displayValue)) && options.length > 0) {
                const matchingOption = options.find(option => 
                  String(option.value) === String(displayValue) || 
                  option.value == displayValue
                );
                if (matchingOption) {
                  displayValue = matchingOption.label;
                  // Update the form value to label if it's still an ID
                  // Check if current city value is the ID (before we changed displayValue)
                  const originalCityValue = values.city;
                  if (originalCityValue && (String(originalCityValue) === String(matchingOption.value) || originalCityValue == matchingOption.value)) {
                    setFieldValue('city', matchingOption.label);
                    console.log('✅ City ID converted to label:', { 
                      cityId: matchingOption.value, 
                      cityLabel: matchingOption.label 
                    });
                  }
                }
              } else if (values.cityId && options.length > 0) {
                // If we have cityId but city is not set or is the ID, find the label
                const matchingOption = options.find(option => 
                  String(option.value) === String(values.cityId) || 
                  option.value == values.cityId
                );
                if (matchingOption) {
                  // Only update if city is empty, is the ID, or doesn't match the label
                  if (!displayValue || displayValue === String(values.cityId) || displayValue !== matchingOption.label) {
                    displayValue = matchingOption.label;
                    setFieldValue('city', matchingOption.label);
                    console.log('✅ City label found from cityId:', { 
                      cityId: values.cityId, 
                      cityLabel: matchingOption.label 
                    });
                  }
                }
              }
            }
            
            return (
              <Dropdown
                key={field.name === "mandal" ? `mandal-${mandalRenderKey}` : field.name === "city" ? `city-${cityRenderKey}` : field.id}
                dropdownname={field.label}
                id={field.id}
                name={field.name}
                value={displayValue}
                onChange={field.name === "mandal" ? handleMandalChange : field.name === "city" ? handleCityChange : handleChange}
                results={stringOptions}
                required={field.required}
                disabled={false}
                dropdownsearch={true}
              />
            );
          } else if (field.type === "search") {
            return (
              <div className={styles.gpin_field_container}>
                <label htmlFor={field.name} className={styles.gpin_field_label}>
                  {field.label}
                  {field.required && <span className={styles.gpin_field_required}>*</span>}
                </label>
                <div className={styles.gpin_search_container}>
                  <SearchBox
                    id={field.id}
                    name={field.name}
                    placeholder={field.placeholder}
                    value={values[field.name] || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    searchicon={<SearchIcon />}
                  />
                </div>
                {meta.touched && meta.error && (
                  <div className={styles.gpin_field_error}>
                    {meta.error}
                  </div>
                )}
              </div>
            );
          } else {
            // Determine which handler to use based on field type
            const getInputHandler = () => {
              if (field.name === "pincode") {
                return handlePincodeInputChange;
              } else if (["doorNo", "streetName", "landmark", "area"].includes(field.name)) {
                return handleTextInputChange;
              } else {
                return handleChange;
              }
            };

            return (
              <Inputbox
                label={field.label}
                id={field.id}
                name={field.name}
                placeholder={field.placeholder}
                value={values[field.name] || ""}
                onChange={getInputHandler()}
                onBlur={handleBlur}
                type={field.type}
                error={meta.touched && meta.error}
                required={field.required}
                disabled={loading && field.name === "pincode"}
              />
            );
          }
        }}
      </Field>
      <FormError
        name={field.name}
        touched={touched}
        errors={errors}
        className={styles.address_info_error}
        externalErrors={(() => {
          if (field.name === 'city' && externalErrors.addressCity) {
            const mappedErrors = { ...externalErrors, city: externalErrors.addressCity };
            return mappedErrors;
          }
          return externalErrors;
        })()}
      />
    </div>
      
      {/* Snackbar for pincode validation messages */}
      {field.name === "pincode" && (
        <Snackbar
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={closeSnackbar}
          duration={4000}
          position="top-right"
        />
      )}
    </>
  );
};

export default memo(AddressFormField);
