// import React, { useState } from "react";
// import styles from "./AccordiansContainer.module.css";
// import Accordian from "../../../widgets/accordian-component/Accordian";

// const AccordiansContainer = () => {
//   const [userRole, setUserRole] = useState("CEO");

//   const accordianData = [
//     {
//       title: "Zone wise graph",
//       graphData: [
//         { label: "Issued", percent: 16 },
//         { label: "Sold", percent: -12 },
//       ],
//       graphBarData: [
//         { year: "2018-2019", issued: 60, sold: 30},
//         { year: "2019-2020", issued: 100, sold: 70 },
//         { year: "2021-2022", issued: 90, sold: 30 },
//         { year: "2023-2024", issued: 100, sold: 60 },
//       ],
//     },
//     {
//       title: "DGM wise graph",
//       graphData: [
//         { label: "Issued", percent: 16 },
//         { label: "Sold", percent: -12 },
//       ],
//       graphBarData: [
//         { year: "2018-2019", issued: 60, sold: 50 },
//         { year: "2019-2020", issued: 100, sold: 70 },
//         { year: "2021-2022", issued: 80, sold: 30 },
//         { year: "2023-2024", issued: 100, sold: 60 },
//       ],
//     },
//     {
//       title: "Campus wise graph",
//       graphData: [
//         { label: "Issued", percent: 16 },
//         { label: "Sold", percent: -12 },
//       ],
//       graphBarData: [
//         { year: "2018-2019", issued: 60, sold: 100 },
//         { year: "2019-2020", issued: 100, sold: 70 },
//         { year: "2021-2022", issued: 100, sold: 30 },
//         { year: "2023-2024", issued: 100, sold: 60 },
//       ],
//     },
//   ];

//   const [expandedIndex, setExpandedIndex] = useState(null);

//   const handleChange = (index) => (_event, isExpanded) => {
//     setExpandedIndex(isExpanded ? index : null);
//   };

//   const getVisibleAccordions = (data) => {
//     return data.filter((accordion) => {
//       if (userRole === "CEO") {
//         return (
//           accordion.title.includes("Zone") ||
//           accordion.title.includes("DGM") ||
//           accordion.title.includes("Campus")
//         );
//       } else if (userRole === "Zone") {
//         return (
//           accordion.title.includes("DGM") || accordion.title.includes("Campus")
//         );
//       } else if (userRole === "DGM") {
//         return accordion.title.includes("Campus");
//       } else if (userRole === "Campus") {
//         return false;
//       }
//       return false;
//     });
//   };

//   const visibleAccordions = getVisibleAccordions(accordianData);

//   return (
//     <div id="accordian_wrapper" className={styles.accordian_wrapper}>
//       {visibleAccordions.map((item, index) => (
//         <Accordian
//           key={index}
//           zoneTitle={item.title}
//           percentageItems={item.graphData}
//           graphBarData={item.graphBarData}
//           expanded={expandedIndex === index}
//           onChange={handleChange(index)}
//         />
//       ))}
//     </div>
//   );
// };

// export default AccordiansContainer;






// 1. Define the master data structure
    // const accordianData = [
    //     {
    //         title: "Zone wise graph",
    //         permissionKey: "DISTRIBUTE_ZONE", // 🔑 Map to the permission key
    //         graphData: [
    //             { label: "Issued", percent: 16 },
    //             { label: "Sold", percent: -12 },
    //         ],
    //         graphBarData: [
    //             { year: "2018-2019", issued: 60, sold: 30 },
    //             { year: "2019-2020", issued: 100, sold: 70 },
    //             { year: "2021-2022", issued: 90, sold: 30 },
    //             { year: "2023-2024", issued: 100, sold: 60 },
    //         ],
    //     },
    //     {
    //         title: "DGM wise graph",
    //         permissionKey: "DISTRIBUTE_DGM", // 🔑 Map to the permission key
    //         graphData: [
    //             { label: "Issued", percent: 16 },
    //             { label: "Sold", percent: -12 },
    //         ],
    //         graphBarData: [
    //             { year: "2018-2019", issued: 60, sold: 50 },
    //             { year: "2019-2020", issued: 100, sold: 70 },
    //             { year: "2021-2022", issued: 80, sold: 30 },
    //             { year: "2023-2024", issued: 100, sold: 60 },
    //         ],
    //     },
    //     {
    //         title: "Campus wise graph",
    //         permissionKey: "DISTRIBUTE_CAMPUS", // 🔑 Map to the permission key
    //         graphData: [
    //             { label: "Issued", percent: 16 },
    //             { label: "Sold", percent: -12 },
    //         ],
    //         graphBarData: [
    //             { year: "2018-2019", issued: 60, sold: 100 },
    //             { year: "2019-2020", issued: 100, sold: 70 },
    //             { year: "2021-2022", issued: 100, sold: 30 },
    //             { year: "2023-2024", issued: 100, sold: 60 },
    //         ],
    //     },
    // ];

import React, { useState, useMemo, useEffect } from "react";
import styles from "./AccordiansContainer.module.css";
import Accordian from "../../../widgets/accordian-component/Accordian";
import { usePermission } from "../../../hooks/usePermission ";
import {
  useGetGraphDataForAdmin,
  useGetGraphDataForEmployee,
  useGetAnalyticsForZone,
  useGetAnalyticsForCampus,
} from "../../../queries/application-analytics/analytics";
import { useSelectedEntity } from "../../../contexts/SelectedEntityContext";

const AccordiansContainer = () => {
  const { canView: canViewZone } = usePermission("DISTRIBUTE_ZONE");
  const { canView: canViewDGM } = usePermission("DISTRIBUTE_DGM");
  const { canView: canViewCampus } = usePermission("DISTRIBUTE_CAMPUS");
  
  const { selectedEntity } = useSelectedEntity();
  
  console.log("=== ACCORDIANS CONTAINER DEBUG ===");
  console.log("Selected Entity in Accordians:", selectedEntity);

  const [userCategory, setUserCategory] = useState(null);
  const [empId, setEmpId] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

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

  // ✅ Conditionally fetch graph data based on role
  const adminGraphQuery = useGetGraphDataForAdmin({
    enabled: !!userCategory && isAdmin,
  });

  const employeeGraphQuery = useGetGraphDataForEmployee(empId, {
    enabled: !!empId && !!userCategory && !isAdmin,
  });
  
  // ✅ Fetch analytics for selected zone/dgm/campus
  const selectedZoneQuery = useGetAnalyticsForZone(selectedEntity.id, {
    enabled: !!selectedEntity.id && selectedEntity.type === "zone",
  });
  
  const selectedCampusQuery = useGetAnalyticsForCampus(selectedEntity.id, {
    enabled: !!selectedEntity.id && selectedEntity.type === "campus",
  });
  
  console.log("=== QUERY STATUS ===");
  console.log("Zone query enabled:", !!selectedEntity.id && selectedEntity.type === "zone");
  console.log("Campus query enabled:", !!selectedEntity.id && selectedEntity.type === "campus");
  console.log("Zone query status:", { 
    isLoading: selectedZoneQuery.isLoading, 
    isFetching: selectedZoneQuery.isFetching,
    data: selectedZoneQuery.data,
    error: selectedZoneQuery.error 
  });
  console.log("Campus query status:", { 
    isLoading: selectedCampusQuery.isLoading, 
    isFetching: selectedCampusQuery.isFetching,
    data: selectedCampusQuery.data,
    error: selectedCampusQuery.error 
  });

  // ✅ Choose which data to use
  const { data: graphResponse, isLoading, error } = isAdmin
    ? adminGraphQuery
    : employeeGraphQuery;

  console.log("=== GRAPH DEBUG ===");
  console.log("User Category:", userCategory);
  console.log("Is Admin:", isAdmin);
  console.log("Employee ID:", empId);
  console.log("Full Graph Response:", graphResponse);
  console.log("Is Loading:", isLoading);
  console.log("Error:", error);

  // ✅ Extract graphData from response
  const rawGraphData = useMemo(() => {
    if (!graphResponse) {
      console.log("No graphResponse available");
      return null;
    }
    
    // Admin response: { metricCards: [...], graphData: {...} }
    // Employee response: { metricsData: {...}, graphData: {...} }
    const extractedData = graphResponse.graphData || null;
    console.log("Extracted graphData:", extractedData);
    return extractedData;
  }, [graphResponse]);

  console.log("Raw Graph Data:", rawGraphData);

  // ✅ Extract role from response for non-admin users
  const userRole = useMemo(() => {
    if (isAdmin) return "Admin";
    return graphResponse?.role || "User";
  }, [graphResponse, isAdmin]);

  console.log("User Role from API:", userRole);

  // ✅ Transform graph data to accordion format
  const accordianData = useMemo(() => {
    if (!rawGraphData) {
      console.log("No graph data available");
      return [];
    }

    // Handle different API structures
    // Admin API: graphData.graphBarData
    // Employee API: graphData.yearlyData
    const barData = rawGraphData.graphBarData || rawGraphData.yearlyData;
    
    if (!barData || barData.length === 0) {
      console.log("No bar data available");
      return [];
    }

    console.log("Bar Data from API:", barData);
    
    // Get the latest year's percentages for the badges
    const latestYear = barData[barData.length - 1];
    
    // Handle both API response formats
    let issuedPercent, soldPercent;
    
    if (isAdmin) {
      // Admin API structure
      issuedPercent = latestYear?.issuedPercent || 0;
      soldPercent = latestYear?.soldPercent || 0;
    } else {
      // Employee API structure (yearlyData)
      issuedPercent = latestYear?.totalAppPercent || 0;
      soldPercent = latestYear?.soldPercent || 0;
    }
    
    // Transform bar data to accordion format
    const transformedBarData = barData.map((item) => {
      if (isAdmin) {
        // Admin API structure
        return {
          year: item.year,
          issued: item.issuedPercent || 0,      // Bar height percentage
          sold: item.soldPercent || 0,          // Bar height percentage
          issuedCount: item.issuedCount || 0,   // Tooltip count
          soldCount: item.soldCount || 0,       // Tooltip count
        };
      } else {
        // Employee API structure (yearlyData)
        return {
          year: item.year,
          issued: item.totalAppPercent || 0,    // Bar height percentage
          sold: item.soldPercent || 0,          // Bar height percentage
          issuedCount: item.totalAppCount || 0, // Tooltip count
          soldCount: item.soldCount || 0,       // Tooltip count
        };
      }
    });

    console.log("Transformed Bar Data:", transformedBarData);
    console.log("Latest Total App %:", issuedPercent);
    console.log("Latest Sold %:", soldPercent);
    
    // Show only ONE accordion based on highest permission
    const accordions = [];
    
    // Determine accordion title based on role
    let accordionTitle;
    if (isAdmin) {
      accordionTitle = "Admin wise graph";
    } else {
      // For non-admin, use role from API response
      accordionTitle = `${userRole} wise graph`;
    }
    
    console.log("Accordion Title:", accordionTitle);
    
    // Determine which accordion to show based on permissions
    if (canViewZone) {
      accordions.push({
        title: accordionTitle,
        permissionKey: "DISTRIBUTE_ZONE",
        graphData: [
          { label: isAdmin ? "Issued" : "Total Applications", percent: issuedPercent },
          { label: "Sold", percent: soldPercent },
        ],
        graphBarData: transformedBarData,
      });
    } else if (canViewDGM) {
      accordions.push({
        title: accordionTitle,
        permissionKey: "DISTRIBUTE_DGM",
        graphData: [
          { label: isAdmin ? "Issued" : "Total Applications", percent: issuedPercent },
          { label: "Sold", percent: soldPercent },
        ],
        graphBarData: transformedBarData,
      });
    } else if (canViewCampus) {
      accordions.push({
        title: accordionTitle,
        permissionKey: "DISTRIBUTE_CAMPUS",
        graphData: [
          { label: isAdmin ? "Issued" : "Total Applications", percent: issuedPercent },
          { label: "Sold", percent: soldPercent },
        ],
        graphBarData: transformedBarData,
      });
    }
    
    return accordions;
  }, [rawGraphData, canViewZone, canViewDGM, canViewCampus, isAdmin, userRole]);

  // ✅ Create accordion for selected zone/dgm/campus
  const selectedEntityAccordion = useMemo(() => {
    console.log("=== BUILDING SELECTED ENTITY ACCORDION ===");
    console.log("Selected Entity:", selectedEntity);
    
    if (!selectedEntity.id || !selectedEntity.name) {
      console.log("No entity selected or missing data");
      return null;
    }

    // Choose which query data to use based on entity type
    const selectedData = selectedEntity.type === "zone" 
      ? selectedZoneQuery.data 
      : selectedCampusQuery.data;

    console.log("Selected entity type:", selectedEntity.type);
    console.log("Zone query data:", selectedZoneQuery.data);
    console.log("Campus query data:", selectedCampusQuery.data);
    console.log("Chosen data:", selectedData);

    if (!selectedData || !selectedData.graphData) {
      console.log("No selected entity data available or no graphData");
      return null;
    }

    console.log("=== SELECTED ENTITY DEBUG ===");
    console.log("Selected Entity:", selectedEntity);
    console.log("Selected Entity Data:", selectedData);

    const selectedGraphData = selectedData.graphData;
    const barData = selectedGraphData.graphBarData || selectedGraphData.yearlyData;

    if (!barData || barData.length === 0) {
      console.log("No bar data for selected entity");
      return null;
    }

    // Get the latest year's percentages
    const latestYear = barData[barData.length - 1];
    const issuedPercent = latestYear?.totalAppPercent || latestYear?.issuedPercent || 0;
    const soldPercent = latestYear?.soldPercent || 0;

    // Transform bar data
    const transformedBarData = barData.map((item) => ({
      year: item.year,
      issued: item.totalAppPercent || item.issuedPercent || 0,
      sold: item.soldPercent || 0,
      issuedCount: item.totalAppCount || item.issuedCount || 0,
      soldCount: item.soldCount || 0,
    }));

    console.log("✅ Creating accordion with title:", `${selectedEntity.name} wise graph`);

    // Use the same label logic as default accordion
    const issuedLabel = isAdmin ? "Issued" : "Total Applications";

    return {
      title: `${selectedEntity.name} wise graph`,
      graphData: [
        { label: issuedLabel, percent: issuedPercent },
        { label: "Sold", percent: soldPercent },
      ],
      graphBarData: transformedBarData,
    };
  }, [selectedEntity, selectedZoneQuery.data, selectedCampusQuery.data, isAdmin]);

  const visibleAccordions = useMemo(() => {
    // Start with default accordion(s)
    const allAccordions = [...accordianData];
    
    console.log("=== VISIBLE ACCORDIONS DEBUG ===");
    console.log("Default accordions:", accordianData);
    console.log("Selected entity accordion:", selectedEntityAccordion);
    
    // Add selected entity accordion if available
    if (selectedEntityAccordion) {
      allAccordions.push(selectedEntityAccordion);
      console.log("✅ Added selected entity accordion");
    }
    
    console.log("Final visible accordions:", allAccordions);
    return allAccordions;
  }, [accordianData, selectedEntityAccordion]);

  const handleChange = (index) => (_event, isExpanded) => {
    setExpandedIndex(isExpanded ? index : null);
  };

  // 🧠 Prevent rendering until category & empId are ready
  if (!userCategory || !empId) {
    console.log("Waiting for user data...", { userCategory, empId });
    return <p>Loading user data...</p>;
  }

  if (isLoading) {
    console.log("Loading graph data...");
    return <p>Loading graphs...</p>;
  }
  
  if (error) {
    console.error("Graph API Error:", error);
    return <p>Error loading graphs: {error.message}</p>;
  }

  if (!graphResponse) {
    console.log("No graph response received");
    return <p>No graph data received from server</p>;
  }

  return (
    <div id="accordian_wrapper" className={styles.accordian_wrapper}>
      {visibleAccordions.length === 0 && (
        <p>No graph data available for your role</p>
      )}
      {visibleAccordions.map((item, index) => (
        <Accordian
          key={item.title}
          zoneTitle={item.title}
          percentageItems={item.graphData}
          graphBarData={item.graphBarData} 
          expanded={expandedIndex === index}
          onChange={handleChange(index)}
        />
      ))}
    </div>
  );
};

export default AccordiansContainer;
