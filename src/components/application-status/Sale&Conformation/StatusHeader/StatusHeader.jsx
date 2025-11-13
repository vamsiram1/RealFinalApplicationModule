import React, { useState, useEffect } from "react";
import styles from "./StatusHeader.module.css";

const StatusHeader = ({ applicationNo, campusName, zoneName, academicYear, applicationFee, category, onDataFetched }) => {
  const [fetchedData, setFetchedData] = useState({
    campusName: campusName || "-",
    zoneName: zoneName || "-",
    academicYear: academicYear || "-",
    academicYearId: null, // Store the ID as well
    applicationFee: applicationFee || "-"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Unified API service function
  const fetchApplicationData = async (applicationNo) => {
    try {
      const url = `http://localhost:8080/api/student-admissions-sale/by-application-no/${applicationNo}?appNo=${applicationNo}`;
     
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
     
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
     
      // Check if response has content
      const contentType = response.headers.get('content-type');
     
      if (!contentType || !contentType.includes('application/json')) {
        // If not JSON, get as text
        const textResponse = await response.text();
       
        // Return empty data if no content
        if (!textResponse || textResponse.trim() === '') {
          return {};
        }
       
        // Try to parse as JSON if it looks like JSON
        try {
          const parsedData = JSON.parse(textResponse);
          return parsedData;
        } catch (parseError) {
          return {};
        }
      }
     
      const data = await response.json();
     
      // Extract data from the response structure
      const extractedData = data.data || data;
      return extractedData;
    } catch (error) {
      throw error;
    }
  };

  // Fetch data using unified API when applicationNo changes
  useEffect(() => {
    const fetchData = async (retryCount = 0) => {
      if (!applicationNo) return;
     
      const maxRetries = 2;
     
      setLoading(true);
      setError(null);
     
      try {
        let data = {};
        let apiSuccess = false;
       
        try {
          data = await fetchApplicationData(applicationNo);
          apiSuccess = true;
        } catch (apiError) {
          data = {};
        }
       
        // Extract payment amount - check multiple possible locations for sold applications
        // Priority: paymentDetails.amount > paymentDetails[0].amount (array) > amount > totalAmount
        let paymentAmount;
        if (data.paymentDetails) {
          // Check if paymentDetails is an array
          if (Array.isArray(data.paymentDetails) && data.paymentDetails.length > 0) {
            paymentAmount = data.paymentDetails[0]?.amount || data.paymentDetails[0]?.paymentAmount;
          } else if (data.paymentDetails.amount) {
            // paymentDetails is an object with amount
            paymentAmount = data.paymentDetails.amount;
          }
        }
        // Fallback to top-level fields
        if (!paymentAmount) {
          paymentAmount = data.amount != null ? data.amount :
                         (data.totalAmount != null ? data.totalAmount :
                         (data.paymentAmount != null ? data.paymentAmount : undefined));
        }

        const processedData = {
          campusName: data.campusName || data.campus || campusName || "-",
          zoneName: data.zoneName || data.zone || zoneName || "-",
          academicYear: data.academicYear || data.year || academicYear || "-",
          academicYearId: data.academicYearId || null,
          applicationFee: data.applicationFee || data.fee || applicationFee || "-",
          amount: paymentAmount
        };

        // Compute combined total if both values are present
        const appFeeNum = Number(processedData.applicationFee) || 0;
        const amountNum = Number(processedData.amount) || 0;
        processedData.totalAmountDue = appFeeNum + amountNum;
       
        setFetchedData(processedData);
       
        // Call the callback to pass data back to parent component
        if (onDataFetched && typeof onDataFetched === 'function') {
          onDataFetched(processedData);
        }
       
        // Clear any previous errors if successful
        setError(null);
      } catch (err) {
        // Retry logic
        if (retryCount < maxRetries) {
          setTimeout(() => {
            fetchData(retryCount + 1);
          }, 1000);
          return;
        }
       
        // After max retries, use only props data - no localStorage fallback
        const fallbackData = {
          campusName: campusName || "-",
          zoneName: zoneName || "-",
          academicYear: academicYear || "-",
          academicYearId: null,
          applicationFee: applicationFee || "-"
        };
       
        setFetchedData(fallbackData);
        setError(null); // Don't show error to user, just use fallback
      } finally {
        if (retryCount === 0) { // Only set loading false on first attempt
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [applicationNo]); // Removed category dependency since we use unified API

  const headerItems = [
    { label: "Academic Year", value: fetchedData.academicYear },
    { label: "Application No", value: applicationNo || "-" },
    { label: "Branch", value: fetchedData.campusName },
    { label: "Zone", value: fetchedData.zoneName },
    { label: "Application Fee", value: fetchedData.applicationFee },
  ];

  return (
    <div className={styles.status_info_header}>
      <div className={styles.status_text_header}>
        {headerItems.map((item) => (
          <div key={item.label} className={styles.status_info_item}>
            <div className={styles.status_label}>{item.label}</div>
            <div className={styles.status_value}>
              {loading ? "Loading..." : item.value}
            </div>
          </div>
        ))}
      </div>
      {error && (
        <div className={styles.error_message}>
          Error loading data: {error}
        </div>
      )}
    </div>
  );
};

export default StatusHeader;
