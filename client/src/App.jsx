import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      // Process the data and generate QR codes
      const processedItems = [];
      const todaysDate = getTodaysDate();
      const currentDay = getCurrentDay();

      jsonData.forEach((row, rowIndex) => {
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
        setLoading(false);
        return;
      }

      setItems(processedItems);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Error processing the Excel file. Please check the file format.');
    }

    setLoading(false);
  };

  const downloadCards = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    const cardsHTML = items.map(item => `
      <div style="
        display: inline-block; 
        margin: 10px; 
        padding: 0; 
        border: 2px solid #8B4513; 
        border-radius: 15px; 
        width: 320px; 
        height: 200px; 
        background: linear-gradient(135deg, #F5E6D3 0%, #E8D5B8 100%);
        page-break-inside: avoid;
        position: relative;
        font-family: Arial, sans-serif;
      ">
        <div style="padding: 15px; height: 170px; position: relative;">
          <!-- Item Name -->
          <div style="font-size: 18px; font-weight: bold; color: #654321; margin-bottom: 8px;">
            ${item.itemName}
          </div>
          
          <!-- Packed Date -->
          <div style="font-size: 14px; color: #8B4513; margin-bottom: 4px;">
            Packed: ${getDisplayDate()}
          </div>
          
          <!-- Net Weight -->
          <div style="font-size: 14px; color: #8B4513; margin-bottom: 4px;">
            Net Weight: ${item.netWeight}
          </div>
          
          <!-- Company Info -->
          <div style="font-size: 12px; color: #8B4513; margin-bottom: 2px;">
            <strong>Pkd By: Villamart Pvt. Ltd</strong>
          </div>
          <div style="font-size: 11px; color: #8B4513; margin-bottom: 2px;">
            Patrapada, Bhubaneswar-19
          </div>
          <div style="font-size: 11px; color: #8B4513; margin-bottom: 2px;">
            Contact: support@villamart.in, 8093123412
          </div>
          <div style="font-size: 11px; color: #8B4513; margin-bottom: 2px;">
            Website: www.villamart.in
          </div>
          <div style="font-size: 11px; color: #8B4513;">
            FSSAI Lic No.: 12024033000159
          </div>
          
          <!-- Right side elements -->
          <div style="position: absolute; top: 15px; right: 15px; display: flex; flex-direction: column; align-items: center;">
            <!-- Symbol box -->
            <div style="
              width: 30px; 
              height: 30px; 
              border: 2px solid #654321; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 18px; 
              font-weight: bold; 
              color: #654321;
              margin-bottom: 5px;
              background: rgba(255,255,255,0.7);
            ">
              ${item.symbol}
            </div>
            
            <!-- Day value box -->
            <div style="
              width: 25px; 
              height: 25px; 
              border: 2px solid #654321; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 14px; 
              font-weight: bold; 
              color: #654321;
              margin-bottom: 10px;
              background: rgba(255,255,255,0.7);
            ">
              ${item.dayValue}
            </div>
            
            <!-- QR Code -->
            <div id="qr-${item.id}" style="background: white; padding: 2px; border-radius: 4px;"></div>
          </div>
          
          <!-- QR Code info at bottom right -->
          <div style="position: absolute; bottom: 5px; right: 15px; font-size: 9px; color: #654321;">
            ${item.qrText.split('_')[1]} ${getDisplayDate().replace(/-/g, '/')}
          </div>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Product Cards</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              background: #f5f5f5;
            }
            @media print {
              body { margin: 0; background: white; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <button class="no-print" onclick="window.print()" style="margin: 10px; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Print Product Cards</button>
          <div>${cardsHTML}</div>
          <script>
            // Generate QR codes after page loads
            ${items.map(item => `
              var qr${item.id.replace(/[^a-zA-Z0-9]/g, '')} = qrcode(0, 'M');
              qr${item.id.replace(/[^a-zA-Z0-9]/g, '')}.addData('${item.qrText}');
              qr${item.id.replace(/[^a-zA-Z0-9]/g, '')}.make();
              document.getElementById('qr-${item.id}').innerHTML = qr${item.id.replace(/[^a-zA-Z0-9]/g, '')}.createImgTag(2);
            `).join('')}
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const clearData = () => {
    setItems([]);
    setError('');
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

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
                  className="relative border-2 border-black rounded-2xl p-4 h-48 bg-gradient-to-br from-yellow-100 to-yellow-200 hover:shadow-lg transition-shadow"
                  style={{
                    background: 'white'
                  }}
                >
                  {/* Main Content */}
                  <div className="h-full relative">
                    {/* Item Name */}
                    <div className="text-lg font-bold text-black mb-2">
                      {item.itemName}
                    </div>
                    
                    {/* Product Info */}
                    <div className="text-sm text-black space-y-1">
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
                      <div className="w-8 h-8 border-2 border-black bg-white bg-opacity-70 flex items-center justify-center font-bold text-black">
                        {item.symbol}
                      </div>
                      
                      {/* Day Value Box */}
                      <div className="w-6 h-6 border-2 border-black bg-white bg-opacity-70 flex items-center justify-center text-sm font-bold text-black">
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
                    <div className="absolute bottom-0 right-0 text-xs text-black">
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
                <p>• Day-based values fetched from: {getCurrentDay()} column</p>
                <p>• Company details remain constant for all cards</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}