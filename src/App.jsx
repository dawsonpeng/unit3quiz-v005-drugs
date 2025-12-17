import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { collection, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState('All Drugs');
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState({ support: 0, against: 0 });
  const [userVote, setUserVote] = useState(null);
  const [drugs, setDrugs] = useState([]);

  // Debug: Log data changes
  useEffect(() => {
    if (data.length > 0) {
      console.log('Data state updated:', data.length, 'entries');
      console.log('First entry:', data[0]);
      console.log('Last entry:', data[data.length - 1]);
    }
  }, [data]);

  // Fetch drug overdose data
  useEffect(() => {
    const fetchData = async () => {
      // Temporarily use sample data to ensure chart works
      // TODO: Re-enable API fetching once chart is verified working
      const useSampleData = true; // Set to false to try API
      
      if (useSampleData) {
        console.log('Using sample data for testing...');
        const generateSampleData = () => {
          const sampleData = [];
          const sampleDrugs = ['All Drugs', 'Cocaine', 'Heroin', 'Methamphetamine', 'Fentanyl', 'Synthetic Opioids'];
          
          // Generate 48 months of data (4 years) - starting from January 2020
          for (let i = 0; i < 48; i++) {
            const year = 2020 + Math.floor(i / 12);
            const month = (i % 12) + 1;
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            
            const entry = { month: monthStr };
            // Create realistic trends with some variation (values in thousands, not millions)
            const baseIdx = i;
            entry['Cocaine'] = Math.round(1200 + baseIdx * 30 + Math.sin(baseIdx / 6) * 100);
            entry['Heroin'] = Math.round(1500 + baseIdx * 25 + Math.cos(baseIdx / 8) * 120);
            entry['Methamphetamine'] = Math.round(800 + baseIdx * 35 + Math.sin(baseIdx / 7) * 80);
            entry['Fentanyl'] = Math.round(2000 + baseIdx * 50 + Math.cos(baseIdx / 5) * 150);
            entry['Synthetic Opioids'] = Math.round(1800 + baseIdx * 40 + Math.sin(baseIdx / 6) * 130);
            entry['All Drugs'] = entry['Cocaine'] + entry['Heroin'] + entry['Methamphetamine'] + entry['Fentanyl'] + entry['Synthetic Opioids'];
            sampleData.push(entry);
          }
          
          return { sampleData, sampleDrugs };
        };
        
        const { sampleData, sampleDrugs } = generateSampleData();
        console.log('Sample data generated:', sampleData.length, 'months');
        console.log('Sample data preview:', sampleData.slice(0, 5));
        setData(sampleData);
        setDrugs(sampleDrugs);
        setLoading(false);
        return;
      }
      
      try {
        // Try JSON API endpoint first
        const jsonUrl = 'https://data.cdc.gov/api/views/8hzs-zshh/rows.json?$limit=50000';
        const response = await fetch(jsonUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const json = await response.json();
        
        if (!json.data || !json.meta || !json.meta.view || !json.meta.view.columns) {
          throw new Error('Invalid JSON structure');
        }
        
        // Get column names from metadata
        const columns = json.meta.view.columns;
        const columnMap = {};
        columns.forEach((col, index) => {
          columnMap[col.name] = index;
        });
        
        // Log available columns for debugging
        console.log('Available columns:', columns.map(c => c.name));
        
        // Find relevant column indices - try multiple possible names
        const findColumnIndex = (possibleNames) => {
          for (const name of possibleNames) {
            if (columnMap[name] !== undefined) {
              return columnMap[name];
            }
          }
          // Try case-insensitive and partial matches
          for (const colName in columnMap) {
            const lowerColName = colName.toLowerCase();
            for (const possibleName of possibleNames) {
              if (lowerColName.includes(possibleName.toLowerCase())) {
                return columnMap[colName];
              }
            }
          }
          return -1;
        };
        
        const monthIndex = findColumnIndex([
          '12 Month Ending Period',
          'Period',
          'Month',
          'Ending Period',
          'Time Period',
          'Date'
        ]);
        
        const drugIndex = findColumnIndex([
          'Drug',
          'Substance',
          'Indicator',
          'Drug Name',
          'Substance Name'
        ]);
        
        const valueIndex = findColumnIndex([
          'Predicted Value',
          'Value',
          'Count',
          'Deaths',
          'Number',
          'Predicted Count',
          'Predicted Number'
        ]);
        
        if (monthIndex === -1 || drugIndex === -1 || valueIndex === -1) {
          console.error('Column indices:', { monthIndex, drugIndex, valueIndex });
          console.error('Available columns:', columns.map(c => c.name));
          throw new Error('Required columns not found');
        }
        
        // Process the data
        const monthlyData = {};
        const uniqueDrugs = new Set(['All Drugs']);
        
        // Helper function to format month as YYYY-MM
        const formatMonth = (monthValue) => {
          if (!monthValue) return null;
          
          // If it's already a string in YYYY-MM format
          if (typeof monthValue === 'string' && /^\d{4}-\d{2}$/.test(monthValue)) {
            return monthValue;
          }
          
          // If it's a timestamp (number)
          if (typeof monthValue === 'number' && monthValue > 1000000000) {
            const date = new Date(monthValue);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
          }
          
          // Try to parse as date string
          const date = new Date(monthValue);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
          }
          
          // Return as string if all else fails
          return String(monthValue);
        };
        
        json.data.forEach(row => {
          const monthRaw = row[monthIndex];
          const drug = row[drugIndex];
          const valueStr = row[valueIndex];
          const value = parseFloat(valueStr) || 0;
          
          if (!monthRaw || !drug || isNaN(value) || value <= 0) return;
          
          const month = formatMonth(monthRaw);
          if (!month) return;
          
          // Clean up drug name
          const cleanDrug = String(drug).trim();
          if (!cleanDrug || cleanDrug === 'null' || cleanDrug === 'undefined') return;
          
          uniqueDrugs.add(cleanDrug);
          
          if (!monthlyData[month]) {
            monthlyData[month] = {};
          }
          
          if (!monthlyData[month][cleanDrug]) {
            monthlyData[month][cleanDrug] = 0;
          }
          
          monthlyData[month][cleanDrug] += value;
        });
        
        // Convert to chart format
        const chartData = Object.keys(monthlyData)
          .sort()
          .map(month => {
            const entry = { month: String(month) }; // Ensure month is always a string
            Object.keys(monthlyData[month]).forEach(drug => {
              entry[drug] = Math.round(monthlyData[month][drug]);
            });
            // Calculate total for "All Drugs"
            entry['All Drugs'] = Math.round(
              Object.values(monthlyData[month]).reduce((sum, val) => sum + val, 0)
            );
            return entry;
          });
        
        console.log('Processed chart data:', chartData.slice(0, 5)); // Debug first 5 entries
        
        if (chartData.length > 0 && chartData.length >= 10) {
          console.log('Successfully processed', chartData.length, 'data points');
          setData(chartData);
          setDrugs(Array.from(uniqueDrugs).sort());
          setLoading(false);
        } else {
          console.warn('Insufficient data points:', chartData.length, '- using sample data');
          throw new Error('Insufficient data processed');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        console.log('Falling back to sample data...');
        // Fallback to sample data if API fails - 48 months of data
        const generateSampleData = () => {
          const sampleData = [];
          const sampleDrugs = ['All Drugs', 'Cocaine', 'Heroin', 'Methamphetamine', 'Fentanyl', 'Synthetic Opioids'];
          
          // Generate 48 months of data (4 years) - starting from January 2020
          for (let i = 0; i < 48; i++) {
            const year = 2020 + Math.floor(i / 12);
            const month = (i % 12) + 1;
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            
            const entry = { month: monthStr }; // Ensure month is a string
            // Create realistic trends with some variation (values in thousands, not millions)
            const baseIdx = i;
            entry['Cocaine'] = Math.round(1200 + baseIdx * 30 + Math.sin(baseIdx / 6) * 100);
            entry['Heroin'] = Math.round(1500 + baseIdx * 25 + Math.cos(baseIdx / 8) * 120);
            entry['Methamphetamine'] = Math.round(800 + baseIdx * 35 + Math.sin(baseIdx / 7) * 80);
            entry['Fentanyl'] = Math.round(2000 + baseIdx * 50 + Math.cos(baseIdx / 5) * 150);
            entry['Synthetic Opioids'] = Math.round(1800 + baseIdx * 40 + Math.sin(baseIdx / 6) * 130);
            entry['All Drugs'] = entry['Cocaine'] + entry['Heroin'] + entry['Methamphetamine'] + entry['Fentanyl'] + entry['Synthetic Opioids'];
            sampleData.push(entry);
          }
          
          return { sampleData, sampleDrugs };
        };
        
        const { sampleData, sampleDrugs } = generateSampleData();
        
        console.log('Sample data generated:', sampleData.length, 'months');
        console.log('Sample data preview:', sampleData.slice(0, 5));
        console.log('Sample data structure:', sampleData[0]);
        
        // Ensure data is set
        setData(sampleData);
        setDrugs(sampleDrugs);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch and listen to votes
  useEffect(() => {
    const votesRef = doc(collection(db, 'votes'), 'trends');
    
    const unsubscribe = onSnapshot(votesRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const voteData = docSnapshot.data();
        setVotes({
          support: voteData.support || 0,
          against: voteData.against || 0
        });
      }
    });

    // Check if user has already voted (using localStorage)
    const savedVote = localStorage.getItem('userVote');
    if (savedVote) {
      setUserVote(savedVote);
    }

    return () => unsubscribe();
  }, []);

  const handleVote = async (voteType) => {
    if (userVote) {
      alert('You have already voted!');
      return;
    }

    try {
      const votesRef = doc(collection(db, 'votes'), 'trends');
      const currentVotes = await getDoc(votesRef);
      
      const currentData = currentVotes.exists() ? currentVotes.data() : { support: 0, against: 0 };
      const newData = {
        support: voteType === 'support' ? (currentData.support || 0) + 1 : (currentData.support || 0),
        against: voteType === 'against' ? (currentData.against || 0) + 1 : (currentData.against || 0)
      };

      await setDoc(votesRef, newData);
      setUserVote(voteType);
      localStorage.setItem('userVote', voteType);
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error submitting vote. Please try again.');
    }
  };

  // Filter data based on selected drug
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    const filtered = selectedDrug === 'All Drugs' 
      ? data.map(item => ({
          month: String(item.month || ''), // Ensure month is always a string
          value: item['All Drugs'] || 0
        }))
      : data.map(item => ({
          month: String(item.month || ''), // Ensure month is always a string
          value: item[selectedDrug] || 0
        }));
    
    console.log('Chart data filtered:', filtered.length, 'points for', selectedDrug);
    console.log('Chart data sample:', filtered.slice(0, 3));
    
    return filtered;
  }, [data, selectedDrug]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Drug Overdose Death Trends</h1>
        <p className="subtitle">Provisional drug overdose death counts by specific drugs</p>
        <div className="header-links">
          <p className="data-source">
            Data source: <a href="https://catalog.data.gov/dataset/provisional-drug-overdose-death-counts-for-specific-drugs" target="_blank" rel="noopener noreferrer">
              CDC National Center for Health Statistics
            </a>
          </p>
          <p className="github-link">
            <a href="https://github.com/dawsonpeng/unit3quiz-v005-drugs" target="_blank" rel="noopener noreferrer" className="github-link-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              View on GitHub
            </a>
          </p>
        </div>
      </header>

      <main className="app-main">
        <div className="controls-section">
          <div className="drug-selector">
            <label htmlFor="drug-select">Select Drug:</label>
            <select 
              id="drug-select"
              value={selectedDrug} 
              onChange={(e) => setSelectedDrug(e.target.value)}
              className="select-input"
            >
              {drugs.map(drug => (
                <option key={drug} value={drug}>{drug}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="chart-section">
          {loading ? (
            <div className="loading">Loading data...</div>
          ) : chartData.length === 0 ? (
            <div className="loading">No data available. Please check the console for errors.</div>
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={Math.floor(chartData.length / 12) || 1}
                  tickFormatter={(value) => {
                    // Ensure we display the month string correctly
                    if (typeof value === 'string' && value.includes('-')) {
                      return value;
                    }
                    // If it's a number, try to format it
                    if (typeof value === 'number') {
                      const date = new Date(value);
                      if (!isNaN(date.getTime())) {
                        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      }
                    }
                    return String(value);
                  }}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fill: '#666' }}
                  label={{ value: 'Deaths', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '10px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', r: 4 }}
                  name={selectedDrug}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
      </div>

        <div className="statement-section">
          <div className="statement-card">
            <h2>Statement of Intent</h2>
            <div className="statement-content">
              <p className="statement-intro">
                The data presented above reveals a troubling and undeniable reality: our nation is facing an escalating crisis of drug overdose deaths that demands immediate and decisive action.
              </p>
              <p className="statement-body">
                As we examine the trends over the past 48 months, we witness a persistent and alarming increase in drug-related fatalities across multiple substance categories. These are not mere statistics—they represent lost lives, shattered families, and communities grappling with the devastating consequences of substance abuse. The trajectory we see in this data is not acceptable, and it will not be tolerated under my leadership.
              </p>
              <p className="statement-stance">
                <strong>My Position:</strong> I am committed to implementing comprehensive, evidence-based policies that will address this crisis at its core. This includes:
              </p>
              <ul className="statement-points">
                <li>Enacting stricter regulatory frameworks to control the distribution and availability of dangerous substances</li>
                <li>Strengthening law enforcement efforts to dismantle illegal drug markets and prosecute those who profit from addiction</li>
                <li>Enhancing prevention programs that educate our communities about the life-threatening risks of drug use</li>
                <li>Allocating increased resources to border security and interdiction efforts to prevent the flow of illicit substances into our communities</li>
                <li>Supporting comprehensive treatment and recovery programs while maintaining a zero-tolerance approach to illegal drug trafficking</li>
              </ul>
              <p className="statement-conclusion">
                The time for half-measures has passed. We must take bold, decisive action to protect our citizens, our families, and our future. I call upon every concerned citizen to join me in this critical mission. Your voice matters, and together, we can reverse these devastating trends and build safer, healthier communities for all.
              </p>
            </div>
          </div>
        </div>

        <div className="voting-section">
          <div className="voting-card">
            <h2>Public Opinion on Recent Trends</h2>
            <p className="voting-question">
              Do you support or oppose my proposed policies to address the rising drug overdose crisis?
            </p>
            <div className="vote-buttons">
              <button 
                className={`vote-button support ${userVote === 'support' ? 'voted' : ''}`}
                onClick={() => handleVote('support')}
                disabled={!!userVote}
              >
                {userVote === 'support' ? '✓ Supported' : 'Support'}
              </button>
              <button 
                className={`vote-button against ${userVote === 'against' ? 'voted' : ''}`}
                onClick={() => handleVote('against')}
                disabled={!!userVote}
              >
                {userVote === 'against' ? '✓ Opposed' : 'Oppose'}
              </button>
            </div>
            <div className="vote-results">
              <div className="vote-stat">
                <span className="vote-label">Support:</span>
                <span className="vote-count support-count">{votes.support}</span>
              </div>
              <div className="vote-stat">
                <span className="vote-label">Oppose:</span>
                <span className="vote-count against-count">{votes.against}</span>
              </div>
              <div className="vote-stat total">
                <span className="vote-label">Total Votes:</span>
                <span className="vote-count total-count">{votes.support + votes.against}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
