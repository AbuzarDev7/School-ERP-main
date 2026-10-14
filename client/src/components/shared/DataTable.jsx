// // src/components/shared/DataTable.jsx
// export default function DataTable({ columns, data }) {
//   return (
//     <div className="bg-white rounded-lg border overflow-x-auto">
//       <table className="min-w-full text-sm">
//         <thead className="bg-gray-50 text-left">
//           <tr>
//             {columns.map((col, i) => (
//               <th key={i} className="p-3 font-medium text-gray-600 whitespace-nowrap">
//                 {col.header}
//               </th>
//             ))}
//           </tr>
//         </thead>

//         <tbody>
//           {data.map((row, i) => (
//             <tr key={i} className="border-t hover:bg-gray-50">
//               {columns.map((col, j) => (
//                 <td key={j} className="p-3 whitespace-nowrap">
//                   {col.render ? col.render(row) : row[col.accessor]}
//                 </td>
//               ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   )
// }



import React, { useState, useMemo } from "react";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";

export default function DataTable({ columns, data }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Handle sorting logic
  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? "";
        const bValue = b[sortConfig.key] ?? "";

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="bg-white rounded-lg overflow-x-auto">
      <table className="min-w-full text-lg border-collapse">
        <thead className="bg-slate-100 border-b-2 border-slate-200">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`p-4 font-bold text-slate-700 whitespace-nowrap border-r border-slate-200 last:border-r-0 ${
                  col.accessor ? "cursor-pointer hover:bg-slate-200 transition-colors" : ""
                } ${col.sticky ? "sticky right-0 bg-slate-100 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]" : ""} ${col.className || ""}`}
                onClick={() => col.accessor && requestSort(col.accessor)}
              >
                <div className="flex items-center gap-2">
                  {col.header}
                  {col.accessor && (
                    <span className="text-slate-300">
                      {sortConfig.key === col.accessor ? (
                        sortConfig.direction === 'asc' ?
                        <ChevronUp size={14} className="text-indigo-600" /> :
                        <ChevronDown size={14} className="text-indigo-600" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-30" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedData.map((row, i) => {
            // Zebra stripes: odd rows stay white, even rows pick up a soft
            // slate tint. Sticky cells need the same backdrop or the stripe
            // would tear at the column boundary while horizontally scrolling.
            const rowBg = i % 2 === 0 ? "bg-white" : "bg-slate-50";
            return (
              <tr
                key={i}
                className={`${rowBg} hover:bg-slate-100 transition-colors border-b border-slate-200 group`}
              >
                {columns.map((col, j) => (
                  <td
                    key={j}
                    className={`p-4 whitespace-nowrap text-slate-600 border-r border-slate-200 last:border-r-0 ${
                      col.sticky
                        ? `sticky right-0 ${rowBg} group-hover:bg-slate-100 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]`
                        : ""
                    } ${col.className || ""}`}
                  >
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            );
          })}
          {sortedData.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-slate-400 italic">
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}