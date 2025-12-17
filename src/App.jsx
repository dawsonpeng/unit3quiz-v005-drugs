import { useState, useEffect } from 'react';
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

  // Fetch drug overdose data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Using the CDC data API endpoint - try CSV format first as it's more reliable
        const csvUrl = 'https://data.cdc.gov/api/views/8hzs-zshh/rows.csv?accessType=DOWNLOAD';
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('Invalid CSV data');
        }
        
        // Simple CSV parser that handles quoted fields
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result.map(v => v.replace(/^"|"$/g, ''));
        };
        
        // Parse CSV header
        const headers = parseCSVLine(lines[0]);
        
        // Find relevant column indices
        const monthIndex = headers.findIndex(h => 
          h.includes('12 Month Ending Period') || h.includes('Period') || h.includes('Month') || h.includes('Ending')
        );
        const drugIndex = headers.findIndex(h => 
          h.includes('Drug') || h.includes('Substance') || h.includes('Indicator')
        );
        const valueIndex = headers.findIndex(h => 
          h.includes('Predicted') || h.includes('Value') || h.includes('Count') || h.includes('Deaths') || h.includes('Number')
        );
        
        if (monthIndex === -1 || drugIndex === -1 || valueIndex === -1) {
          throw new Error('Required columns not found');
        }
        
        // Parse CSV data
        const monthlyData = {};
        const uniqueDrugs = new Set(['All Drugs']);
        
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          
          if (values.length <= Math.max(monthIndex, drugIndex, valueIndex)) continue;
          
          const month = values[monthIndex];
          const drug = values[drugIndex];
          const value = parseFloat(values[valueIndex]) || 0;
          
          if (!month || !drug || isNaN(value) || value <= 0) continue;
          
          uniqueDrugs.add(drug);
          
          if (!monthlyData[month]) {
            monthlyData[month] = {};
          }
          
          if (!monthlyData[month][drug]) {
            monthlyData[month][drug] = 0;
          }
          
          monthlyData[month][drug] += value;
        }
        
        // Convert to chart format
        const chartData = Object.keys(monthlyData)
          .sort()
          .map(month => {
            const entry = { month };
            Object.keys(monthlyData[month]).forEach(drug => {
              entry[drug] = Math.round(monthlyData[month][drug]);
            });
            // Calculate total for "All Drugs"
            entry['All Drugs'] = Math.round(
              Object.values(monthlyData[month]).reduce((sum, val) => sum + val, 0)
            );
            return entry;
          });
        
        if (chartData.length > 0) {
          setData(chartData);
          setDrugs(Array.from(uniqueDrugs).sort());
        } else {
          throw new Error('No data processed');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback to sample data if API fails
        const sampleData = [];
        const sampleDrugs = ['All Drugs', 'Cocaine', 'Heroin', 'Methamphetamine', 'Fentanyl'];
        const baseMonths = ['2020-01', '2020-02', '2020-03', '2020-04', '2020-05', '2020-06'];
        
        baseMonths.forEach((month, idx) => {
          const entry = { month };
          entry['Cocaine'] = 1200 + idx * 50;
          entry['Heroin'] = 1500 + idx * 60;
          entry['Methamphetamine'] = 800 + idx * 40;
          entry['Fentanyl'] = 2000 + idx * 100;
          entry['All Drugs'] = entry['Cocaine'] + entry['Heroin'] + entry['Methamphetamine'] + entry['Fentanyl'];
          sampleData.push(entry);
        });
        
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
  const chartData = selectedDrug === 'All Drugs' 
    ? data.map(item => ({
        month: item.month,
        value: item['All Drugs'] || 0
      }))
    : data.map(item => ({
        month: item.month,
        value: item[selectedDrug] || 0
      }));

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Drug Overdose Death Trends</h1>
        <p className="subtitle">Provisional drug overdose death counts by specific drugs</p>
        <p className="data-source">
          Data source: <a href="https://catalog.data.gov/dataset/provisional-drug-overdose-death-counts-for-specific-drugs" target="_blank" rel="noopener noreferrer">
            CDC National Center for Health Statistics
          </a>
        </p>
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
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#666"
                  tick={{ fill: '#666' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
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

        <div className="voting-section">
          <div className="voting-card">
            <h2>Public Opinion on Recent Trends</h2>
            <p className="voting-question">
              Do you support or oppose the recent trends in drug overdose deaths?
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
