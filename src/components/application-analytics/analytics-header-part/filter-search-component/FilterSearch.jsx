import React from "react";
import styles from "./FilterSearch.module.css";
import { useSelectedEntity } from "../../../../contexts/SelectedEntityContext";

const normalize = (s = "") => s.toLowerCase().replace(/\s+/g, " ").trim();

const FilterSearch = ({ suggestions = [], onItemClick }) => {
  const { selectEntity } = useSelectedEntity();

  const handleItemClick = (item) => {
    console.log("🔍 Search item clicked:", item);
    
    // Extract the actual ID from the composite id (format: "zone-123" or "campus-456")
    const idParts = item.id.split('-');
    const actualId = idParts.length > 1 ? idParts[1] : item.id;
    
    // Determine entity type based on item.type
    const entityType = item.type.toLowerCase(); // "Zone" -> "zone", "Campus" -> "campus", "DGM" -> "dgm"
    
    // For DGM, we use "campus" as the entity type (same as dropdown logic)
    const normalizedType = entityType === "dgm" ? "campus" : entityType;
    
    console.log(`✅ Selecting entity from search:`, {
      id: actualId,
      name: item.name,
      type: normalizedType
    });
    
    // Call the same selectEntity function as dropdown
    selectEntity(actualId, item.name, normalizedType);
    
    // Notify parent component (optional callback)
    onItemClick?.(item);
  };

  return (
    <div className={styles.filter_search_container}>
      <div className={styles.suggestion_header}>
        <p className={styles.suggestion_text_head}>Search Suggestions</p>
        <div className={styles.line_wrapper}>
          <hr className={styles.suggestion_line} />
        </div>
      </div>

      <ul>
        {suggestions.map((item, index) => (
          <li
            className={styles.list_items}
            key={`${normalize(item.name)}-${index}`}
            onClick={() => handleItemClick(item)}
            style={{ cursor: 'pointer' }}
          >
            <span>{item?.name}</span>
            {item?.type && (
              <span className={styles.item_type}> ({item.type})</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FilterSearch;

