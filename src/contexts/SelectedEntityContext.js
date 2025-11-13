import React, { createContext, useContext, useState } from "react";

const SelectedEntityContext = createContext();

export const SelectedEntityProvider = ({ children }) => {
  const [selectedEntity, setSelectedEntity] = useState({
    id: null,
    name: null,
    type: null, // 'zone', 'dgm', or 'campus'
  });

  const selectEntity = (id, name, type) => {
    console.log("=== CONTEXT: selectEntity called ===");
    console.log("ID:", id, "Name:", name, "Type:", type);
    setSelectedEntity({ id, name, type });
  };

  const clearSelection = () => {
    console.log("=== CONTEXT: clearSelection called ===");
    setSelectedEntity({ id: null, name: null, type: null });
  };

  return (
    <SelectedEntityContext.Provider
      value={{ selectedEntity, selectEntity, clearSelection }}
    >
      {children}
    </SelectedEntityContext.Provider>
  );
};

export const useSelectedEntity = () => {
  const context = useContext(SelectedEntityContext);
  if (!context) {
    throw new Error(
      "useSelectedEntity must be used within a SelectedEntityProvider"
    );
  }
  return context;
};
