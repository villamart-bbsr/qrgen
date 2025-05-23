import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDataTable, setShowDataTable] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [tempData, setTempData] = useState([]);

  // Get today's date in YYYYMMDD format
  const getTodaysDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // Get today's date in DD-MM-YYYY format for display
  const getDisplayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Get current day name
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    return days[today.getDay()];
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is Excel format
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Use SheetJS to parse the Excel file
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Convert sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      
      if (jsonData.length === 0) {
        setError('The Excel file appears to be empty');
        setLoading(false);
        return;
      }

      // Store raw data
      setRawData(jsonData);
      setTempData(jsonData);
      
      // Generate cards from the raw data
      generateCardsFromData(jsonData);
      setShowDataTable(true);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Error processing the Excel file. Please check the file format.');
    }

    setLoading(false);
  };

  const generateCardsFromData = (dataToProcess) => {
    if (!dataToProcess || dataToProcess.length === 0) return;

    const processedItems = [];
    const todaysDate = getTodaysDate();
    const currentDay = getCurrentDay();

    dataToProcess.forEach((row, rowIndex) => {
      try {
        // Try different possible column names (case insensitive)
        const itemCode = row['itemCode'] || row['item_code'] || row['Item Code'] || 
                        row['code'] || row['Code'] || row['ITEM_CODE'];
        const itemName = row['itemName'] || row['item_name'] || row['Item Name'] || 
                        row['name'] || row['Name'] || row['ITEM_NAME'];
        const count = row['count'] || row['Count'] || row['quantity'] || 
                     row['Quantity'] || row['COUNT'] || row['no_of_items'];
        
        // New fields
        const netWeight = row['netWeight'] || row['net_weight'] || row['Net Weight'] || 
                         row['weight'] || row['Weight'] || row['NET_WEIGHT'];
        const symbol = row['symbol'] || row['Symbol'] || row['SYMBOL'];
        
        // Day-wise column (based on current day)
        const dayValue = row[currentDay] || row[currentDay.toLowerCase()] || 
                        row[currentDay.toUpperCase()] || '';

        if (!itemCode || !itemName || !count) {
          console.warn(`Row ${rowIndex + 1}: Missing required fields (itemCode, itemName, count)`);
          return;
        }

        const numCount = parseInt(count);
        if (isNaN(numCount) || numCount <= 0) {
          console.warn(`Row ${rowIndex + 1}: Invalid count value`);
          return;
        }

        // Generate individual items based on count
        for (let i = 0; i < numCount; i++) {
          processedItems.push({
            id: `${itemCode}-${i + 1}`,
            itemCode: String(itemCode),
            itemName: String(itemName),
            netWeight: netWeight || '500g',
            symbol: symbol || 'T',
            dayValue: dayValue || '2',
            qrText: `a_${itemCode}_${todaysDate}`,
            serialNumber: i + 1,
            totalCount: numCount
          });
        }
      } catch (err) {
        console.error(`Error processing row ${rowIndex + 1}:`, err);
      }
    });

    if (processedItems.length === 0) {
      setError('No valid items found. Please check your Excel format. Expected columns: itemCode, itemName, count, netWeight, symbol, and day columns (Monday, Tuesday, etc.)');
      return;
    }

    setItems(processedItems);
  };

  const updateCellValue = (rowIndex, column, value) => {
    const updatedData = tempData.map((row, index) => {
      if (index === rowIndex) {
        // If updating count, ensure it's a valid number
        if (column === 'count') {
          const numValue = parseInt(value);
          if (isNaN(numValue) || numValue < 0) {
            return row; // Keep original value if invalid
          }
          return { ...row, [column]: numValue };
        }
        return { ...row, [column]: value };
      }
      return row;
    });
    setTempData(updatedData);
  };

  const saveChanges = () => {
    setRawData(tempData);
    generateCardsFromData(tempData);
    setEditMode(false);
    setEditingCell(null);
  };

  const cancelEdit = () => {
    setTempData(rawData);
    setEditMode(false);
    setEditingCell(null);
  };

  const startEdit = () => {
    setTempData([...rawData]);
    setEditMode(true);
  };

  const addNewRow = () => {
    const newRow = {
      itemCode: '',
      itemName: '',
      count: 1,
      netWeight: '500g',
      symbol: 'T',
      Monday: '1',
      Tuesday: '2', 
      Wednesday: '3',
      Thursday: '4',
      Friday: '5',
      Saturday: '6',
      Sunday: '7'
    };
    if (editMode) {
      setTempData([...tempData, newRow]);
    } else {
      const newData = [...rawData, newRow];
      setRawData(newData);
      setTempData(newData);
      generateCardsFromData(newData);
    }
  };

  const deleteRow = (rowIndex) => {
    if (editMode) {
      const updatedData = tempData.filter((_, index) => index !== rowIndex);
      setTempData(updatedData);
    } else {
      const updatedData = rawData.filter((_, index) => index !== rowIndex);
      setRawData(updatedData);
      setTempData(updatedData);
      generateCardsFromData(updatedData);
    }
  };

  const clearData = () => {
    setItems([]);
    setRawData([]);
    setTempData([]);
    setError('');
    setShowDataTable(false);
    setEditingCell(null);
    setEditMode(false);
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  const downloadCards = () => {
    // Create TSC printer optimized version
    const printWindow = window.open('', '_blank');
    const cardsHTML = items.map(item => `
      <div class="label" style="
        display: block; 
        margin: 0; 
        padding: 0; 
        border: none; 
        width: 70mm; 
        height: 30mm; 
        background: white;
        page-break-before: always;
        page-break-after: always;
        page-break-inside: avoid;
        position: relative;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
        overflow: hidden;
      ">
        <div style="padding: 1mm; height: 28mm; position: relative; box-sizing: border-box; display: flex; background: white;">
          <!-- Left side content -->
          <div style="flex: 1; padding-right: 1mm;">
            <!-- Item Name -->
            <div style="font-size: 10px; font-weight: bold; color: black; margin-bottom: 1mm; line-height: 1.1; font-family: Arial, sans-serif;">
              ${item.itemName}
            </div>
            
            <!-- Packed Date and Net Weight -->
            <div style="font-size: 7px; color: black; margin-bottom: 0.5mm; line-height: 1.1; font-family: Arial, sans-serif;">
              Packed: ${getDisplayDate()}
            </div>
            <div style="font-size: 7px; color: black; margin-bottom: 1mm; line-height: 1.1; font-family: Arial, sans-serif;">
              Net Weight: ${item.netWeight}
            </div>
            
            <!-- Company Info - compact for thermal printing -->
            <div style="font-size: 5px; color: black; line-height: 1.2; font-family: Arial, sans-serif;">
              <strong>Pkd By: Villamart Pvt. Ltd</strong><br>
              Patrapada, Bhubaneswar-19<br>
              support@villamart.in, 8093123412<br>
              www.villamart.in<br>
              FSSAI: 12024033000159
            </div>
          </div>

          <!-- Right side elements -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-width: 18mm;">
            <!-- Top row: Symbol and Day value -->
            <div style="display: flex; gap: 1mm; margin-bottom: 1mm;">
              <!-- Symbol box -->
              <div style="
                width: 7mm; 
                height: 7mm; 
                border: 1px solid black; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 8px; 
                font-weight: bold; 
                color: black;
                background: white;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
              ">
                ${item.symbol}
              </div>
              
              <!-- Day value box -->
              <div style="
                width: 6mm; 
                height: 6mm; 
                border: 1px solid black; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 7px; 
                font-weight: bold; 
                color: black;
                background: white;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
              ">
                ${item.dayValue}
              </div>
            </div>
            
            <!-- QR Code -->
            <div style="display: flex; flex-direction: column; align-items: center;">
              <div id="qr-${item.id}" style="background: white; padding: 0; margin-bottom: 0.5mm;"></div>
              <!-- QR Code info -->
              <div style="font-size: 4px; color: black; text-align: center; line-height: 1; font-family: Arial, sans-serif;">
                ${item.qrText.split('_')[1]}<br>${getDisplayDate().replace(/-/g, '/')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>TSC Thermal Labels - 70x30mm</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 0;
              background: white;
              color: black;
            }
            @media print {
              body { 
                margin: 0 !important; 
                padding: 0 !important; 
                background: white !important; 
              }
              @page {
                size: 70mm 30mm;
                margin: 0 !important;
              }
              .label {
                page-break-before: always;
                page-break-after: always;
                page-break-inside: avoid;
              }
              .label:first-child {
                page-break-before: avoid;
              }
              .no-print { 
                display: none !important; 
              }
            }
            @media screen {
              .label {
                border: 1px dashed #ccc;
                margin: 5mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="padding: 10px; background: #f0f0f0; border-bottom: 1px solid #ccc;">
            <h3 style="margin: 0 0 10px 0;">TSC Thermal Printer Labels</h3>
            <p style="margin: 0 0 10px 0; font-size: 14px;">Label Size: 70mm x 30mm | Total Labels: ${items.length}</p>
            <button onclick="window.print()" style="margin-right: 10px; padding: 8px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Print Labels</button>
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
              <strong>TSC Printer Setup:</strong><br>
              • Set paper size to 70mm x 30mm<br>
              • Enable "Fit to page" or "Scale: 100%"<br>
              • Set margins to 0mm<br>
              • Use high quality/300dpi setting for QR codes
            </div>
          </div>
          <div>${cardsHTML}</div>
          <script>
            // Generate QR codes after page loads - smaller size for thermal printing
            ${items.map(item => `
              var qr${item.id.replace(/[^a-zA-Z0-9]/g, '')} = qrcode(0, 'M');
              qr${item.id.replace(/[^a-zA-Z0-9]/g, '')}.addData('${item.qrText}');
              qr${item.id.replace(/[^a-zA-Z0-9]/g, '')}.make();
              document.getElementById('qr-${item.id}').innerHTML = qr${item.id.replace(/[^a-zA-Z0-9]/g, '')}.createImgTag(2, 0);
            `).join('')}
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const dataToShow = editMode ? tempData : rawData;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Product Card Generator with QR Codes
          </h1>
          <p className="text-gray-600">
            Upload an Excel file with product details to generate branded product cards
          </p>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Excel File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={loading}
            />
          </div>
          
          <div className="text-sm text-gray-500 mb-4">
            <p><strong>Expected Excel format:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><strong>itemCode</strong> (or code, Item Code) - Product code</li>
              <li><strong>itemName</strong> (or name, Item Name) - Product name</li>
              <li><strong>count</strong> (or quantity, Count) - Number of cards to generate</li>
              <li><strong>netWeight</strong> (or weight, Net Weight) - Product weight (e.g., 500g)</li>
              <li><strong>symbol</strong> (or Symbol) - Symbol to display (e.g., T, V, N)</li>
              <li><strong>Day columns</strong> - Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday</li>
            </ul>
            <p className="mt-2 text-blue-600">
              <strong>Current day:</strong> {getCurrentDay()} (will fetch from {getCurrentDay()} column)
            </p>
          </div>

          {loading && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Processing Excel file...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Data Table Section */}
        {showDataTable && dataToShow.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Product Data ({dataToShow.length} rows)
                {editMode && <span className="text-orange-600 ml-2">[EDIT MODE]</span>}
              </h2>
              <div className="space-x-2">
                {!editMode ? (
                  <>
                    <button
                      onClick={startEdit}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Edit Data
                    </button>
                    <button
                      onClick={addNewRow}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Row
                    </button>
                    <button
                      onClick={() => setShowDataTable(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Hide Table
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={saveChanges}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addNewRow}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Row
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead className={editMode ? "bg-orange-50" : "bg-gray-50"}>
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net Weight</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mon</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tue</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Wed</th>
                    <th className={`border border-gray-300 px-3 py-2 text-left text-xs font-medium uppercase ${getCurrentDay() === 'Thursday' ? 'bg-blue-200 text-blue-800' : 'text-gray-500'}`}>Thu</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fri</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sat</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sun</th>
                  </tr>
                </thead>
                <tbody>
                  {dataToShow.map((row, rowIndex) => (
                    <tr key={rowIndex} className={editMode ? "hover:bg-orange-50" : "hover:bg-gray-50"}>
                      <td className="border border-gray-300 px-3 py-2">
                        <button
                          onClick={() => deleteRow(rowIndex)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                        >
                          Delete
                        </button>
                      </td>
                      {['itemCode', 'itemName', 'count', 'netWeight', 'symbol', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((column) => (
                        <td key={column} className={`border border-gray-300 px-3 py-2 ${getCurrentDay() === column ? 'bg-blue-100' : ''}`}>
                          {editMode && editingCell === `${rowIndex}-${column}` ? (
                            <input
                              type="text"
                              value={row[column] || ''}
                              onChange={(e) => updateCellValue(rowIndex, column, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingCell(null);
                                }
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              autoFocus
                            />
                          ) : (
                            <div
                              onClick={() => editMode && setEditingCell(`${rowIndex}-${column}`)}
                              className={`min-h-6 p-1 rounded text-sm ${editMode ? 'cursor-pointer hover:bg-orange-100' : ''}`}
                            >
                              {row[column] || ''}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              {editMode ? (
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <p className="font-medium text-orange-800 mb-2">Edit Mode Active:</p>
                  <p>• Click on any cell to edit its value</p>
                  <p>• Press Enter or click outside to confirm cell changes</p>
                  <p>• Click "Save Changes" to update the product cards</p>
                  <p>• Click "Cancel" to discard all changes</p>
                </div>
              ) : (
                <div>
                  <p>• Click "Edit Data" to modify values</p>
                  <p>• Current day: <span className="font-semibold text-blue-600">{getCurrentDay()}</span> (highlighted column will be used for day values)</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show Data Table Button */}
        {rawData.length > 0 && !showDataTable && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 text-center">
            <button
              onClick={() => setShowDataTable(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Show/Edit Data Table ({rawData.length} rows)
            </button>
          </div>
        )}

        {/* Results Section */}
        {items.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Generated Product Cards ({items.length} items)
              </h2>
              <div className="space-x-2">
                <button
                  onClick={downloadCards}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Print/Download Cards
                </button>
                <button
                  onClick={clearData}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className="relative border-2 border-yellow-800 rounded-2xl p-4 h-48 bg-gradient-to-br from-yellow-100 to-yellow-200 hover:shadow-lg transition-shadow"
                  style={{
                    background: 'linear-gradient(135deg, #F5E6D3 0%, #E8D5B8 100%)'
                  }}
                >
                  {/* Main Content */}
                  <div className="h-full relative">
                    {/* Item Name */}
                    <div className="text-lg font-bold text-yellow-900 mb-2">
                      {item.itemName}
                    </div>
                    
                    {/* Product Info */}
                    <div className="text-sm text-yellow-800 space-y-1">
                      <div>Packed: {getDisplayDate()}</div>
                      <div>Net Weight: {item.netWeight}</div>
                      <div className="font-semibold">Pkd By: Villamart Pvt. Ltd</div>
                      <div className="text-xs">Patrapada, Bhubaneswar-19</div>
                      <div className="text-xs">Contact: support@villamart.in, 8093123412</div>
                      <div className="text-xs">Website: www.villamart.in</div>
                      <div className="text-xs">FSSAI Lic No.: 12024033000159</div>
                    </div>
                    
                    {/* Right Side Elements */}
                    <div className="absolute top-0 right-0 flex flex-col items-center space-y-2">
                      {/* Symbol Box */}
                      <div className="w-8 h-8 border-2 border-yellow-900 bg-white bg-opacity-70 flex items-center justify-center font-bold text-yellow-900">
                        {item.symbol}
                      </div>
                      
                      {/* Day Value Box */}
                      <div className="w-6 h-6 border-2 border-yellow-900 bg-white bg-opacity-70 flex items-center justify-center text-sm font-bold text-yellow-900">
                        {item.dayValue}
                      </div>
                      
                      {/* QR Code */}
                      <div className="bg-white p-1 rounded">
                        <QRCodeSVG 
                          value={item.qrText} 
                          size={60}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                    
                    {/* QR Info at bottom right */}
                    <div className="absolute bottom-0 right-0 text-xs text-yellow-800">
                      {item.itemCode} {getDisplayDate().replace(/-/g, '/')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Section */}
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Card Information:</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• QR codes contain format: <code>a_&lt;itemCode&gt;_&lt;todaysDate&gt;</code></p>
                <p>• Packed date: {getDisplayDate()}</p>
                <p>• Current day: <span className="font-semibold text-blue-600">{getCurrentDay()}</span></p>
                <p>• Click "Print/Download Cards" to generate a printable version</p>
                <p>• Click "Clear All" to reset the application</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
      