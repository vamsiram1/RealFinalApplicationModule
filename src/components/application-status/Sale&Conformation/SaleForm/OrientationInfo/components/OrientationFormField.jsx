import React, { useState } from 'react';
import { Field } from 'formik';
import Inputbox from '../../../../../../widgets/Inputbox/InputBox';
import Dropdown from '../../../../../../widgets/Dropdown/Dropdown';
import FormError from './FormError';
import { saleApi } from '../../services/saleApi';
import styles from './OrientationFormField.module.css';


const OrientationFormField = ({ field, values, handleChange, handleBlur, errors, touched, setFieldValue, externalErrors, onClearFieldError }) => {
  // Get category from localStorage to determine if Branch dropdown should be disabled
  const category = localStorage.getItem("category");
  const isSchoolLogin = category === 'SCHOOL';
  // Combined state for better performance
  const [orientationState, setOrientationState] = useState({
    branchTypeOptions: [],
    cityOptions: [],
    studentTypeOptions: [],
    classOptions: [],
    orientationOptions: [],
    campusOptions: [],
    loading: false,
    filteredStudentTypes: [],
    studentTypeId: null,
    joiningClassId: null,
    orientationId: null
  });

  // Destructure for easier access
  const { 
    branchTypeOptions, 
    cityOptions, 
    studentTypeOptions, 
    classOptions, 
    orientationOptions, 
    campusOptions, 
    loading, 
    filteredStudentTypes 
  } = orientationState;

  // API call to fetch orientations by class and campus using saleApi service
  // Define this BEFORE useEffects that use it
  const fetchOrientationsByClass = React.useCallback(async (classId, cmpsId) => {
    try {
      if (!classId || !cmpsId) {
        console.warn('Missing classId or cmpsId for fetching orientations', { classId, cmpsId });
        return;
      }
      const data = await saleApi.getOrientationsByClass(classId, cmpsId);
      
      if (data && Array.isArray(data)) {
        // Convert all values to strings for consistent matching
        const transformedOptions = data.map(item => ({
          value: String(item.orientationId || item.orientation_id || item.id),
          label: item.orientationName || item.orientation_name || item.name || item.title
        }));
        
        setOrientationState(prev => ({ ...prev, orientationOptions: transformedOptions }));
      }
    } catch (error) {
      console.error('Error fetching orientations by class:', error);
    }
  }, []);

  // API call to fetch student types using saleApi service
  const fetchStudentTypes = async () => {
    try {
      const data = await saleApi.getStudentTypes();
      
      if (data && Array.isArray(data)) {
        // Convert all values to strings for consistent matching
        const transformedOptions = data.map(item => ({
          value: String(item.student_type_id || item.id),
          label: item.student_type_name || item.name || item.title
        }));
        
        setOrientationState(prev => ({ ...prev, studentTypeOptions: transformedOptions }));
      }
    } catch (error) {
    }
  };

  // API call to fetch campuses by category using saleApi service
  const fetchCampusesByCategory = async () => {
    try {
      // Get category from localStorage (from login response)
      const category = localStorage.getItem("category");
      
      if (!category) {
        return;
      }
      
      // Convert category to lowercase for API parameter
      const businessType = category.toLowerCase();
      
      const data = await saleApi.getCampusesByCategory(businessType);
      
      // Check if response has nested data array
      const campusData = data?.data || data;
      
      if (campusData && Array.isArray(campusData)) {
        // Convert all values to strings for consistent matching
        const transformedOptions = campusData.map(item => ({
          value: String(item.id || item.campusId || item.campus_id),
          label: item.name || item.campusName || item.campus_name
        }));
        
        setOrientationState(prev => ({ ...prev, campusOptions: transformedOptions }));
      }
    } catch (error) {
    }
  };

  // Fetch student types on component mount
  React.useEffect(() => {
    fetchStudentTypes();
    fetchCampusesByCategory(); // Also fetch campuses
  }, []);

  // Initialize filtered student types when student types are loaded
  React.useEffect(() => {
    if (studentTypeOptions.length > 0 && filteredStudentTypes.length === 0) {
      setOrientationState(prev => ({ ...prev, filteredStudentTypes: studentTypeOptions }));
    }
  }, [studentTypeOptions, filteredStudentTypes.length]);

  // Fetch classes when branch value changes
  React.useEffect(() => {
    if (values.branch && campusOptions.length > 0) {
      const selectedCampus = campusOptions.find(option => option.label === values.branch);
      if (selectedCampus) {
        fetchClassesByCampus(selectedCampus.value);
      }
    }
  }, [values.branch, campusOptions]);

  // Filter student types based on branch type
  React.useEffect(() => {
    if (field.name === "studentType" && values.branchType) {
      
      // Filter student types based on branch type
      const filtered = studentTypeOptions.filter(option => {
        const optionLabel = option.label.toLowerCase();
        const branchType = values.branchType.toLowerCase();
        
        // If branch type is "day scholar" or similar, only show day scholar options
        if (branchType.includes('day') && !branchType.includes('res')) {
          return optionLabel.includes('day') || optionLabel.includes('scholar');
        }
        
        // If branch type is "DS AND RES" or "Residential", show remaining options (not day scholar)
        if (branchType.includes('ds and res') || branchType.includes('residential') || branchType.includes('res')) {
          return !optionLabel.includes('day') && !optionLabel.includes('scholar');
        }
        
        // For other branch types, show all options
        return true;
      });
      
      setOrientationState(prev => ({ ...prev, filteredStudentTypes: filtered }));
    } else if (field.name === "studentType" && !values.branchType) {
      // If no branch type selected, show all student types
      setOrientationState(prev => ({ ...prev, filteredStudentTypes: studentTypeOptions }));
    }
  }, [field.name, values.branchType, studentTypeOptions]);

  // Auto-populate branch field from localStorage when campus options are loaded
  React.useEffect(() => {
    if (campusOptions.length > 0 && field.name === "branch" && !values.branch) {
      const campusName = localStorage.getItem("campusName");
      
      if (campusName) {
        // Try to find matching option in API data
        const matchingOption = campusOptions.find(option => option.label === campusName);
        if (matchingOption) {
          setFieldValue('branch', matchingOption.label);
          setFieldValue('branchId', matchingOption.value); // Store ID alongside label
          // Trigger API call to get branch details
          fetchBranchDetails(matchingOption.label);
        }
      }
    }
  }, [campusOptions, field.name, values.branch, setFieldValue]);

  // API call to get campus type and city when branch is selected
  // Define this BEFORE the useEffect that uses it to avoid "Cannot access before initialization" error
  const fetchBranchDetails = React.useCallback(async (branchValue) => {
    if (!branchValue) return;
    
    setOrientationState(prev => ({ ...prev, loading: true }));
    try {
      // Find the campus ID from the selected branch value
      const selectedCampus = campusOptions.find(option => option.label === branchValue);
      
      if (!selectedCampus) {
        console.warn('⚠️ fetchBranchDetails: No matching campus found for branch:', branchValue);
        return;
      }
      
      const campusId = selectedCampus.value;
      console.log('🔄 fetchBranchDetails: Fetching details for branch:', { branch: branchValue, campusId });
      
      const data = await saleApi.getBranchDetails(campusId);
      
      if (data) {
        const { campusType, cityName, campusTypeId, cityId } = data;
        console.log('✅ fetchBranchDetails: Received data:', { campusType, cityName, campusTypeId, cityId });
        
        
        // Update branch type options
        if (campusType) {
          const branchTypeOption = [{ value: campusTypeId || campusType.toLowerCase().replace(/\s+/g, '_'), label: campusType }];
          setOrientationState(prev => ({ ...prev, branchTypeOptions: branchTypeOption }));
          setFieldValue('branchType', campusType);
          console.log('✅ fetchBranchDetails: Set branchType:', campusType);
          if (campusTypeId) {
            setFieldValue('branchTypeId', campusTypeId); // Store ID alongside label
            console.log('✅ fetchBranchDetails: Set branchTypeId:', campusTypeId);
          }
        }
        
        // Update city options
        if (cityName) {
          const cityOption = [{ value: cityId || cityName.toLowerCase().replace(/\s+/g, '_'), label: cityName }];
          setOrientationState(prev => ({ ...prev, cityOptions: cityOption }));
          setFieldValue('city', cityName);
          console.log('✅ fetchBranchDetails: Set city:', cityName);
          if (cityId) {
            setFieldValue('cityId', cityId); // Store ID alongside label
            console.log('✅ fetchBranchDetails: Set cityId:', cityId);
          }
        }
      } else {
        console.warn('⚠️ fetchBranchDetails: No data received from API');
      }
      
      // Also fetch classes for the campus using the selected campus ID
      await fetchClassesByCampus(campusId);
      
    } catch (error) {
      console.error('❌ fetchBranchDetails: Error fetching branch details:', error);
    } finally {
      setOrientationState(prev => ({ ...prev, loading: false }));
    }
  }, [campusOptions, setFieldValue]);

  // Auto-populate branch details when campus options are loaded and branch field has value
  React.useEffect(() => {
    if (campusOptions.length > 0 && field.name === "branch" && values.branch) {
      // Check if the current branch value matches any campus option (by label or value/ID)
      const matchingCampus = campusOptions.find(option => 
        option.label === values.branch || 
        String(option.value) === String(values.branch) ||
        option.value == values.branch
      );
      
      if (matchingCampus) {
        // If branch is an ID, update it to the label for display
        if (String(matchingCampus.value) === String(values.branch) && matchingCampus.label !== values.branch) {
          setFieldValue('branch', matchingCampus.label);
        }
        setFieldValue('branchId', matchingCampus.value); // Store ID alongside existing label
        // Always fetch branch details if branchType and city are not already set (to ensure auto-population works)
        if (!values.branchType || !values.city) {
          console.log('🔄 Fetching branch details for auto-population:', { 
            branch: values.branch, 
            branchId: matchingCampus.value,
            branchLabel: matchingCampus.label,
            hasBranchType: !!values.branchType,
            hasCity: !!values.city
          });
          fetchBranchDetails(matchingCampus.label); // Use label for API call
        } else {
          console.log('ℹ️ Branch details already populated, skipping fetch:', { 
            branchType: values.branchType, 
            city: values.city 
          });
        }
      } else {
        console.warn('⚠️ No matching campus found for branch value:', values.branch, 'Available options:', campusOptions.map(opt => ({ label: opt.label, value: opt.value })));
      }
    }
  }, [campusOptions, values.branch, values.branchType, values.city, field.name, fetchBranchDetails, setFieldValue]);

  // Fetch classes when Joining Class field renders and branch is selected
  React.useEffect(() => {
    if (field.name === "joiningClass" && values.branch) {
      fetchClassesByCampus(921);
    }
  }, [field.name, values.branch]);

  // Fetch orientations when Orientation Name field renders and joining class is selected
  React.useEffect(() => {
    if (field.name === "orientationName") {
      // Get branchId - try from values first, then from branch label
      let branchIdToUse = values.branchId;
      if (!branchIdToUse && values.branch && campusOptions.length > 0) {
        const branchOption = campusOptions.find(opt => 
          opt.label === values.branch || 
          String(opt.value) === String(values.branch) ||
          opt.value == values.branch
        );
        if (branchOption) {
          branchIdToUse = branchOption.value;
        }
      }
      
      // Check if we have joiningClass (label) or joiningClassId
      const hasJoiningClass = values.joiningClass || values.joiningClassId;
      
      if (branchIdToUse && hasJoiningClass) {
        // Find the class ID from the classOptions array
        const selectedClass = classOptions.find(option => 
          String(option.value) === String(values.joiningClass) || 
          option.value == values.joiningClass ||
          option.label === values.joiningClass ||
          String(option.value) === String(values.joiningClassId) ||
          option.value == values.joiningClassId
        );
        
        if (selectedClass) {
          fetchOrientationsByClass(selectedClass.value, branchIdToUse);
        } else {
          // If not found, try using the value directly (in case it's already an ID)
          // Also try to find by joiningClassId if available
          const classIdToUse = values.joiningClassId || values.joiningClass;
          if (classIdToUse) {
            fetchOrientationsByClass(classIdToUse, branchIdToUse);
          }
        }
      }
    }
  }, [field.name, values.joiningClass, values.joiningClassId, values.branchId, values.branch, classOptions, campusOptions, fetchOrientationsByClass]);

  // Fetch orientations when form initializes with orientationId or orientationName as ID (for edit mode)
  React.useEffect(() => {
    if (field.name === "orientationName") {
      // Check if orientationName is an ID (numeric) or if orientationId exists
      const hasOrientationId = values.orientationId || (values.orientationName && /^\d+$/.test(String(values.orientationName)));
      
      // If we have orientation data but no options loaded yet, try to fetch them
      if (hasOrientationId && orientationOptions.length === 0) {
        let branchIdToUse = values.branchId;
        let joiningClassIdToUse = values.joiningClassId;
        
        // If branchId is missing, try to find it from branch label
        if (!branchIdToUse && values.branch && campusOptions.length > 0) {
          const branchOption = campusOptions.find(opt => 
            opt.label === values.branch || 
            String(opt.value) === String(values.branch) ||
            opt.value == values.branch
          );
          if (branchOption) {
            branchIdToUse = branchOption.value;
            console.log('🔍 Found branchId from branch label:', { branch: values.branch, branchId: branchIdToUse });
          }
        }
        
        // If branchId is still missing and we have campusOptions, try to use the first one or get from localStorage
        if (!branchIdToUse && campusOptions.length > 0) {
          // Try to get from localStorage as fallback
          const campusName = localStorage.getItem("campusName");
          if (campusName) {
            const branchOption = campusOptions.find(opt => 
              opt.label === campusName || 
              String(opt.value) === String(campusName) ||
              opt.value == campusName
            );
            if (branchOption) {
              branchIdToUse = branchOption.value;
              console.log('🔍 Found branchId from localStorage campusName:', { campusName, branchId: branchIdToUse });
            }
          }
        }
        
        // If joiningClassId is missing, try to find it from joiningClass label
        if (!joiningClassIdToUse && values.joiningClass && classOptions.length > 0) {
          const classOption = classOptions.find(opt => 
            opt.label === values.joiningClass || 
            String(opt.value) === String(values.joiningClass) ||
            opt.value == values.joiningClass
          );
          if (classOption) {
            joiningClassIdToUse = classOption.value;
            console.log('🔍 Found joiningClassId from joiningClass label:', { joiningClass: values.joiningClass, joiningClassId: joiningClassIdToUse });
          }
        }
        
        // If we have both IDs now, fetch orientations
        if (branchIdToUse && joiningClassIdToUse) {
          console.log('🔄 Fetching orientations for edit mode:', { branchId: branchIdToUse, joiningClassId: joiningClassIdToUse });
          fetchOrientationsByClass(joiningClassIdToUse, branchIdToUse);
        } else {
          console.warn('⚠️ Cannot fetch orientations - missing required IDs:', { 
            branchId: branchIdToUse, 
            joiningClassId: joiningClassIdToUse,
            branch: values.branch,
            joiningClass: values.joiningClass,
            campusOptionsCount: campusOptions.length,
            classOptionsCount: classOptions.length,
            hasOrientationId,
            orientationOptionsLength: orientationOptions.length
          });
        }
      }
    }
  }, [field.name, values.orientationId, values.orientationName, values.branchId, values.branch, values.joiningClassId, values.joiningClass, orientationOptions.length, fetchOrientationsByClass, campusOptions, classOptions]);

  // API call to fetch classes by campus using saleApi service
  // Note: fetchBranchDetails is already defined above (line 187) using useCallback
  const fetchClassesByCampus = async (campusId) => {
    try {
      const data = await saleApi.getClassesByCampus(campusId);
      
      
      if (data && Array.isArray(data)) {
        // Convert all values to strings for consistent matching
        const transformedOptions = data.map(item => ({
          value: String(item.classId || item.class_id || item.id),
          label: item.className || item.class_name || item.name || item.title
        }));
        
        setOrientationState(prev => ({ ...prev, classOptions: transformedOptions }));
      } else {
        // Set empty array if no data
        setOrientationState(prev => ({ ...prev, classOptions: [] }));
      }
    } catch (error) {
      // Set empty array on error
      setOrientationState(prev => ({ ...prev, classOptions: [] }));
    }
  };

  // Note: fetchBranchDetails is already defined above (line 187) using useCallback
  // Removed duplicate definition to fix "Cannot redeclare block-scoped variable" error

  const getOptions = (optionsKey) => {
    
    const optionsMap = {
      "branchTypeOptions": branchTypeOptions,
      "branchOptions": (() => {
        if (campusOptions && campusOptions.length > 0) {
          return campusOptions;
        }
        
        // Fallback: Get campus name from localStorage (from login response) - PRESERVE AUTO-POPULATION
        const campusName = localStorage.getItem("campusName");
        
        if (campusName) {
          const branchOption = {
            value: campusName.toLowerCase().replace(/\s+/g, '_'),
            label: campusName
          };
          return [branchOption];
        }
        
        return [];
      })(),
      "campusOptions": campusOptions,
      "orientationOptions": orientationOptions,
      "admissionTypeOptions": [],
      "studentTypeOptions": filteredStudentTypes.length > 0 ? filteredStudentTypes : studentTypeOptions,
      "cityOptions": cityOptions,
      "classOptions": (() => {
        // Only return API data - no fallback options
        // classOptions comes from API call to getClassesByCampus
        return Array.isArray(classOptions) ? classOptions : [];
      })()
    };
    
    const result = optionsMap[optionsKey] || [];
    return result;
  };

  return (
    <div className={styles.orientation_info_form_field}>
      <Field name={field.name}>
        {({ field: fieldProps, meta }) => {
          const options = getOptions(field.options);
          const stringOptions = options.map(option => option.label || option.value);
          
          // Debug: Log orientation options for orientationName field
          if (field.name === "orientationName") {
            console.log('🔍 Orientation Name Field Debug:', {
              fieldName: field.name,
              fieldType: field.type,
              optionsCount: options.length,
              options: options,
              stringOptionsCount: stringOptions.length,
              stringOptions: stringOptions,
              orientationOptionsFromState: orientationOptions,
              values: {
                orientationName: values.orientationName,
                orientationId: values.orientationId,
                branchId: values.branchId,
                branch: values.branch,
                joiningClassId: values.joiningClassId,
                joiningClass: values.joiningClass
              },
              campusOptionsCount: campusOptions.length,
              campusOptions: campusOptions,
              classOptionsCount: classOptions.length
            });
          }
          
          // Get the current selected option to display the label instead of ID
          // Use loose equality to handle type mismatch (string vs number)
          // For orientationName, check both orientationName and orientationId
          let valueToMatch = values[field.name];
          if (field.name === "orientationName") {
            // Priority: orientationId > orientationName (if it's an ID)
            if (values.orientationId) {
              valueToMatch = values.orientationId;
            } else if (valueToMatch && /^\d+$/.test(String(valueToMatch))) {
              // orientationName is already an ID (like "309"), use it directly for matching
              valueToMatch = valueToMatch;
            }
          }
          
          // Find the matching option - try multiple matching strategies
          const selectedOption = options.find(option => {
            // Try exact string match first
            if (String(option.value) === String(valueToMatch)) return true;
            // Try loose equality for type coercion
            if (option.value == valueToMatch) return true;
            // Try label match (in case valueToMatch is actually a label)
            if (option.label === valueToMatch) return true;
            return false;
          });
          
          // Display the label if found, otherwise show the value (which might be an ID temporarily)
          const displayValue = selectedOption ? selectedOption.label : (valueToMatch || "");
          
          // Debug logging for joining class
          if (field.name === "joiningClass") {
          }

          // Auto-select campus for Branch field - PRESERVE AUTO-POPULATION
          let fieldValue = displayValue;
          if (field.name === "branch" && !fieldValue && options.length > 0) {
            const campusName = localStorage.getItem("campusName");
            
            if (campusName) {
              // Try to find matching option in API data first
              const matchingOption = options.find(option => 
                option.label === campusName || 
                option.value === campusName.toLowerCase().replace(/\s+/g, '_')
              );
              
              if (matchingOption) {
                fieldValue = matchingOption.label;
              } else {
                // Fallback to direct campus name
                fieldValue = campusName;
              }
              
              // Auto-set the value if not already set
              if (!values[field.name]) {
                handleChange({
                  target: {
                    name: field.name,
                    value: fieldValue
                  }
                });
                // Trigger API call to get branch details
                fetchBranchDetails(fieldValue);
                
                // Also fetch classes for the auto-populated branch
                if (matchingOption) {
                  fetchClassesByCampus(matchingOption.value);
                } else {
                  // If no matching option found, try to get campus ID from localStorage or use a fallback
                  const campusId = localStorage.getItem('campusId') || localStorage.getItem('campus_id');
                  if (campusId) {
                    fetchClassesByCampus(campusId);
                  } else {
                  }
                }
              }
            }
          }

          // Handle Branch field change to trigger API call
          const handleBranchChange = (e) => {
            // Clear external error for this field when user selects an option
            if (onClearFieldError && externalErrors['branch']) {
              onClearFieldError('branch');
            }
            
            handleChange(e);
            if (field.name === "branch") {
              // Find the selected option to get both label and ID
              const selectedOption = campusOptions.find(option => option.label === e.target.value);
              if (selectedOption) {
                setFieldValue('branchId', selectedOption.value); // Store ID alongside label
                
                // Fetch classes for the selected campus/branch
                fetchClassesByCampus(selectedOption.value);
              }
              fetchBranchDetails(e.target.value);
            }
          };

          // Handle Student Type field change to store ID
          const handleStudentTypeChange = (e) => {
            // Clear external error for this field when user selects an option
            if (onClearFieldError && externalErrors['studentType']) {
              onClearFieldError('studentType');
            }
            
            handleChange(e);
            if (field.name === "studentType") {
              // Find the selected option to get both label and ID
              const selectedOption = (filteredStudentTypes.length > 0 ? filteredStudentTypes : studentTypeOptions)
                .find(option => option.label === e.target.value);
              
              if (selectedOption) {
                setFieldValue('studentTypeId', selectedOption.value);
                setOrientationState(prev => ({ ...prev, studentTypeId: selectedOption.value }));
              } else {
                setFieldValue('studentTypeId', '');
                setOrientationState(prev => ({ ...prev, studentTypeId: null }));
              }
            }
          };

          // Handle Joining Class field change to store ID
          const handleJoiningClassChange = (e) => {
            // Clear external error for this field when user selects an option
            if (onClearFieldError && externalErrors['joiningClass']) {
              onClearFieldError('joiningClass');
            }
            
            handleChange(e);
            if (field.name === "joiningClass") {
              // Find the selected option to get both label and ID
              const selectedOption = classOptions.find(option => option.label === e.target.value);
              
              if (selectedOption) {
                setFieldValue('joiningClassId', selectedOption.value);
                setOrientationState(prev => ({ ...prev, joiningClassId: selectedOption.value }));
              } else {
                setFieldValue('joiningClassId', '');
                setOrientationState(prev => ({ ...prev, joiningClassId: null }));
              }
            }
          };

          // Handle Orientation field change to store ID
          const handleOrientationChange = (e) => {
            // Clear external error for this field when user selects an option
            if (onClearFieldError && externalErrors['orientationName']) {
              onClearFieldError('orientationName');
            }
            
            handleChange(e);
            if (field.name === "orientationName") {
              // Find the selected option to get both label and ID
              const selectedOption = orientationOptions.find(option => option.label === e.target.value);
              
              if (selectedOption) {
                setFieldValue('orientationId', selectedOption.value);
                setOrientationState(prev => ({ ...prev, orientationId: selectedOption.value }));
              } else {
                setFieldValue('orientationId', '');
                setOrientationState(prev => ({ ...prev, orientationId: null }));
              }
            }
          };

          // Custom handler for Academic Year field to filter invalid characters
          const handleAcademicYearChange = (e) => {
            const { name, value } = e.target;
            
            // Clear external error for this field when user starts typing
            if (onClearFieldError && externalErrors[name]) {
              onClearFieldError(name);
            }
            
            // Allow letters, numbers, spaces, hyphens, and periods for academic year format
            const filteredValue = value.replace(/[^A-Za-z0-9\s\-\.]/g, '');
            
            handleChange({
              ...e,
              target: {
                ...e.target,
                value: filteredValue
              }
            });
          };

          // For Branch Type and City, render as read-only input fields instead of dropdowns
          if (field.name === "branchType" || field.name === "city") {
            return (
              <Inputbox
                label={field.label}
                id={field.id}
                name={field.name}
                placeholder={field.placeholder}
                value={fieldValue}
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

          // For School login, render Branch as read-only input field instead of dropdown
          if (field.name === "branch" && isSchoolLogin) {
            return (
              <Inputbox
                label={field.label}
                id={field.id}
                name={field.name}
                placeholder={field.placeholder}
                value={fieldValue}
                onChange={() => {}} // No-op function to prevent any changes
                onBlur={handleBlur}
                type="text"
                error={meta.touched && meta.error}
                required={field.required}
                readOnly={true}
                disabled={true} // Make it completely non-editable for School login
              />
            );
          }

          return field.type === "dropdown" ? (
            <Dropdown
              dropdownname={field.label}
              id={field.id}
              name={field.name}
              value={displayValue}
              onChange={field.name === "branch" ? handleBranchChange : field.name === "studentType" ? handleStudentTypeChange : field.name === "joiningClass" ? handleJoiningClassChange : field.name === "orientationName" ? handleOrientationChange : handleChange}
              results={stringOptions}
              required={field.required}
              disabled={loading || (field.name === "branch" && isSchoolLogin)}
              dropdownsearch={true}
            />
          ) : (
            <Inputbox
              label={field.label}
              id={field.id}
              name={field.name}
              placeholder={field.placeholder}
              value={values[field.name] || ""}
              onChange={field.name === "academicYear" ? handleAcademicYearChange : handleChange}
              onBlur={handleBlur}
              type={field.type}
              error={meta.touched && meta.error}
              required={field.required}
            />
          );
        }}
      </Field>
      <FormError
        name={field.name}
        touched={touched}
        errors={errors}
        className={styles.orientation_info_error}
        externalErrors={externalErrors}
      />
    </div>
  );
};

export default OrientationFormField;

