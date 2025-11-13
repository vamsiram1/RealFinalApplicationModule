import React, { useEffect, useState } from "react";
import styles from "../metric-cards/MetricCards.module.css";
import {
  useGetMetricsForAdmin,
  useGetMetricsForEmployee,
  useGetAnalyticsForZone,
  useGetAnalyticsForCampus,
} from "../../../../queries/application-analytics/analytics";
import { useSelectedEntity } from "../../../../contexts/SelectedEntityContext";

const MetricCards = () => {
  const [userCategory, setUserCategory] = useState(null);
  const [empId, setEmpId] = useState(null);
  
  const { selectedEntity } = useSelectedEntity();
  
  console.log("=== METRIC CARDS DEBUG ===");
  console.log("Selected Entity in MetricCards:", selectedEntity);

  // ✅ Load category & empId from localStorage
  useEffect(() => {
    const storedCategory = localStorage.getItem("category");
    const storedEmpId = localStorage.getItem("empId");
    if (storedCategory) setUserCategory(storedCategory.toUpperCase());
    if (storedEmpId) setEmpId(storedEmpId);
  }, []);

  // ✅ Identify user type (Admin vs others)
  const isZonalAccountant =
    userCategory === "SCHOOL" || userCategory === "COLLEGE";
  const isAdmin = !!userCategory && !isZonalAccountant;

  // ✅ Conditionally fetch metrics based on role
  const adminMetricsQuery = useGetMetricsForAdmin({
    enabled: !!userCategory && isAdmin,
  });

  const employeeMetricsQuery = useGetMetricsForEmployee(empId, {
    enabled: !!empId && !!userCategory && !isAdmin,
  });
  
  // ✅ Fetch analytics for selected zone/dgm/campus
  const selectedZoneQuery = useGetAnalyticsForZone(selectedEntity.id, {
    enabled: !!selectedEntity.id && selectedEntity.type === "zone",
  });
  
  const selectedCampusQuery = useGetAnalyticsForCampus(selectedEntity.id, {
    enabled: !!selectedEntity.id && selectedEntity.type === "campus",
  });

  // ✅ Choose which data to use
  let metricsResponse, isLoading, error;
  
  console.log("=== CHOOSING METRICS DATA ===");
  console.log("Selected entity ID:", selectedEntity.id);
  console.log("Selected entity type:", selectedEntity.type);
  
  // If entity is selected, use its data; otherwise use default data
  if (selectedEntity.id) {
    const selectedQuery = selectedEntity.type === "zone" 
      ? selectedZoneQuery 
      : selectedCampusQuery;
    ({ data: metricsResponse, isLoading, error } = selectedQuery);
    console.log("Using Selected Entity Metrics for:", selectedEntity.name);
    console.log("Selected query data:", selectedQuery.data);
    console.log("Is loading:", selectedQuery.isLoading);
  } else {
    ({ data: metricsResponse, isLoading, error } = isAdmin
      ? adminMetricsQuery
      : employeeMetricsQuery);
    console.log("Using Default Metrics (Admin:", isAdmin, ")");
  }

  console.log("User Category:", userCategory);
  console.log("Is Admin:", isAdmin);
  console.log("Employee ID:", empId);
  console.log("Metrics Response:", metricsResponse);

  // 🧠 Prevent rendering until category & empId are ready
  if (!userCategory || !empId) {
    return <p>Loading user data...</p>;
  }

  if (isLoading) return <p>Loading metrics...</p>;
  if (error) return <p>Error: {error.message}</p>;

  // ✅ Transform API response to cards format
  // Admin API returns: { metricCards: [...], graphData: {...} }
  // Employee API returns: { metricsData: { metrics: [...] }, graphData: {...} }
  // Selected Entity API returns: { metricsData: { metrics: [...] }, graphData: {...} }
  let cards = [];
  
  if (selectedEntity.id) {
    // Selected entity response structure (similar to employee)
    console.log("Using Selected Entity - metricsData:", metricsResponse?.metricsData);
    const metricsData = metricsResponse?.metricsData;
    if (metricsData && metricsData.metrics) {
      cards = metricsData.metrics.map((metric) => ({
        title: metric.title || "N/A",
        value: metric.currentValue || 0,
        percentage: Math.round(Number(metric.percentageChange) || 0),
      }));
    }
  } else if (isAdmin) {
    // Admin response structure
    console.log("Using Admin API - metricCards:", metricsResponse?.metricCards);
    cards = (metricsResponse?.metricCards || []).map((card) => ({
      ...card,
      percentage: Math.round(Number(card.percentage) || 0),
    }));
  } else {
    // Employee response structure
    console.log("Using Employee API - metricsData:", metricsResponse?.metricsData);
    const metricsData = metricsResponse?.metricsData;
    if (metricsData && metricsData.metrics) {
      cards = metricsData.metrics.map((metric) => ({
        title: metric.title || "N/A",
        value: metric.currentValue || 0,
        percentage: Math.round(Number(metric.percentageChange) || 0),
      }));
    }
  }

  console.log("Final Cards:", cards);

  if (!cards || cards.length === 0) {
    return <p>No metrics cards to display</p>;
  }

  return (
    <div className={styles.metric_cards_container}>
      {cards.map((card, index) => {
        // Handle percentage colors and styling
        const isPositive = card.percentage > 0;
        const isNegative = card.percentage < 0;
        
        const cardColor = isPositive ? styles.card_green : styles.card_red;
        const percentageColor = isPositive ? styles.green_text : styles.red_text;
        const percentageBorder = isPositive
          ? styles.percentage_box_border_green
          : styles.percentage_box_border_red;
        const arrowDirection = isPositive
          ? "M2.08337 4.66667L5.00004 1.75M5.00004 1.75L7.91671 4.66667M5.00004 1.75V9.25"
          : "M7.91671 6.33333L5.00004 9.25M5.00004 9.25L2.08337 6.33333M5.00004 9.25V1.75";

        return (
          <div className={`${styles.metric_card} ${cardColor}`} key={index}> 
            <div className={styles.metric_card_values}>
              <strong className={styles.card_value}>{card.value}</strong>
              
              <div className={`${styles.percentage_number_box} ${percentageBorder}`}>
                <span className={`${styles.card_percentage_text} ${percentageColor}`}>
                  {`${card.percentage >= 0 ? "+" : ""}${card.percentage}%`}
                </span>
                <span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="11"
                    viewBox="0 0 10 11"
                    fill="none"
                  >
                    <path
                      d={arrowDirection}
                      stroke={isPositive ? "#22C55E" : "#EF4444"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </div>
            <p className={styles.card_state}>{card.title}</p>
          </div>
        );
      })}
    </div>
  );
};

export default MetricCards;
