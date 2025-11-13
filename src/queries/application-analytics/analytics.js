import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const ANALYTICS_GET_ADMIN = "http://localhost:8080/api/applications";
const DISTRIBUTION_GETS = "http://localhost:8080/distribution/gets";

// ----------------------
// 📊 Admin APIs
// ----------------------
const getAllZones = async () =>
  (await axios.get(`${ANALYTICS_GET_ADMIN}/zones`)).data;

const getAllDgms = async () =>
  (await axios.get(`${ANALYTICS_GET_ADMIN}/dgmcampuses`)).data;

const getAllCampuses = async () =>
  (await axios.get(`${ANALYTICS_GET_ADMIN}/campuses`)).data;

// ----------------------
// 🧾 Zonal Accountant & DGM APIs
// ----------------------
const getDgmsForZonalAccountant = async (empId) => {
  if (!empId) return [];
  const { data } = await axios.get(
    `${DISTRIBUTION_GETS}/dgmforzonal_accountant/${empId}`
  );
  return data;
};

const getCampusesForZonalAccountant = async (empId) => {
  if (!empId) return [];
  const { data } = await axios.get(
    `${DISTRIBUTION_GETS}/campusesforzonal_accountant/${empId}`
  );
  return data;
};

const getCampusesByDgmEmpId = async (empId) => {
  if (!empId) return [];
  const { data } = await axios.get(
    `${DISTRIBUTION_GETS}/campusesfordgm/${empId}`
  );
  return data;
};

// ----------------------
// 📊 Metrics APIs
// ----------------------
const getMetricsForAdmin = async () => {
  const { data } = await axios.get(`http://localhost:8080/api/dashboard/CO/admin_cards_graph`);
  return data;
};

const getMetricsForEmployee = async (empId) => {
  if (!empId) return null;
  const { data } = await axios.get(`http://localhost:8080/api/analytics/${empId}`);
  return data;
};

// ----------------------
// 📈 Graph Data APIs (for Accordions)
// ----------------------
const getGraphDataForAdmin = async () => {
  const { data } = await axios.get(`http://localhost:8080/api/dashboard/CO/admin_cards_graph`);
  return data;
};

const getGraphDataForEmployee = async (empId) => {
  if (!empId) return null;
  const { data } = await axios.get(`http://localhost:8080/api/analytics/${empId}`);
  return data;
};

// ----------------------
// 📊 Analytics for Selected Zone/Campus/DGM
// ----------------------
const getAnalyticsForZone = async (zoneId) => {
  console.log("🔵 API CALL: getAnalyticsForZone with zoneId:", zoneId);
  if (!zoneId) return null;
  const { data } = await axios.get(`http://localhost:8080/api/analytics/zone/${zoneId}`);
  console.log("🔵 API RESPONSE: getAnalyticsForZone data:", data);
  return data;
};

const getAnalyticsForCampus = async (campusId) => {
  console.log("🟢 API CALL: getAnalyticsForCampus with campusId:", campusId);
  if (!campusId) return null;
  const { data } = await axios.get(`http://localhost:8080/api/analytics/campus/${campusId}`);
  console.log("🟢 API RESPONSE: getAnalyticsForCampus data:", data);
  return data;
};

// ----------------------
// ⚙️ React Query Hooks (accept options)
// ----------------------

// ✅ Admin
export const useGetAllZones = (options = {}) =>
  useQuery({
    queryKey: ["Get All Zones"],
    queryFn: getAllZones,
    ...options,
  });

export const useGetAllDgms = (options = {}) =>
  useQuery({
    queryKey: ["Get All DGMs"],
    queryFn: getAllDgms,
    ...options,
  });

export const useGetAllCampuses = (options = {}) =>
  useQuery({
    queryKey: ["Get All Campuses"],
    queryFn: getAllCampuses,
    ...options,
  });

// ✅ Zonal Accountant & DGM
export const useGetDgmsForZonalAccountant = (empId, options = {}) =>
  useQuery({
    queryKey: ["Get DGMs for Zonal Accountant", empId],
    queryFn: () => getDgmsForZonalAccountant(empId),
    enabled: !!empId && (options.enabled ?? true),
    ...options,
  });

export const useGetCampuesForZonalAccountant = (empId, options = {}) =>
  useQuery({
    queryKey: ["Get Campuses for Zonal Accountant", empId],
    queryFn: () => getCampusesForZonalAccountant(empId),
    enabled: !!empId && (options.enabled ?? true),
    ...options,
  });

export const useGetCampuesForDgmEmpId = (empId, options = {}) =>
  useQuery({
    queryKey: ["Get Campuses for DGM", empId],
    queryFn: () => getCampusesByDgmEmpId(empId),
    enabled: !!empId && (options.enabled ?? true),
    ...options,
  });

// ✅ Metrics
export const useGetMetricsForAdmin = (options = {}) =>
  useQuery({
    queryKey: ["Get Metrics for Admin"],
    queryFn: getMetricsForAdmin,
    ...options,
  });

export const useGetMetricsForEmployee = (empId, options = {}) =>
  useQuery({
    queryKey: ["Get Metrics for Employee", empId],
    queryFn: () => getMetricsForEmployee(empId),
    enabled: !!empId && (options.enabled ?? true),
    ...options,
  });

// ✅ Graph Data (for Accordions)
export const useGetGraphDataForAdmin = (options = {}) =>
  useQuery({
    queryKey: ["Get Graph Data for Admin"],
    queryFn: getGraphDataForAdmin,
    ...options,
  });

export const useGetGraphDataForEmployee = (empId, options = {}) =>
  useQuery({
    queryKey: ["Get Graph Data for Employee", empId],
    queryFn: () => getGraphDataForEmployee(empId),
    enabled: !!empId && (options.enabled ?? true),
    ...options,
  });

// ✅ Analytics for Selected Zone/Campus/DGM
export const useGetAnalyticsForZone = (zoneId, options = {}) =>
  useQuery({
    queryKey: ["Get Analytics for Zone", zoneId],
    queryFn: () => getAnalyticsForZone(zoneId),
    enabled: !!zoneId && (options.enabled ?? true),
    ...options,
  });

export const useGetAnalyticsForCampus = (campusId, options = {}) =>
  useQuery({
    queryKey: ["Get Analytics for Campus", campusId],
    queryFn: () => getAnalyticsForCampus(campusId),
    enabled: !!campusId && (options.enabled ?? true),
    ...options,
  });
