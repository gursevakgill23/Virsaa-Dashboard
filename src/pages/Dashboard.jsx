import React, { useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { FaEllipsisV } from 'react-icons/fa';
import styles from './Page.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('games'); // Default tab for Content Overview
  const [activeGurbaniTab, setActiveGurbaniTab] = useState('audio'); // Default tab for Gurbani
  const [activeSikhHistoryTab, setActiveSikhHistoryTab] = useState('articles'); // Default tab for Sikh History

  // Static data for cards
  const cardData = [
    { title: 'Total Users', value: 1200 },
    { title: 'Premium Users', value: 300 },
    { title: 'Total Ebooks', value: 150 },
    { title: 'Total Audiobooks', value: 80 },
    { title: 'Total Authors', value: 50 },
  ];

  // Static data for pie charts
  const userChartData = {
    labels: ['Total Users', 'Premium Users'],
    datasets: [
      {
        data: [1200, 300],
        backgroundColor: ['var(--gradient-start)', 'var(--gradient-end)'],
        hoverBackgroundColor: ['var(--accent)', 'var(--button-bg)'],
      },
    ],
  };

  const bookChartData = {
    labels: ['All Books', 'Premium Books'],
    datasets: [
      {
        data: [150, 50],
        backgroundColor: ['var(--gradient-start)', 'var(--gradient-end)'],
        hoverBackgroundColor: ['var(--accent)', 'var(--button-bg)'],
      },
    ],
  };

  const audiobookChartData = {
    labels: ['All Audiobooks', 'Premium Audiobooks'],
    datasets: [
      {
        data: [80, 20],
        backgroundColor: ['var(--gradient-start)', 'var(--gradient-end)'],
        hoverBackgroundColor: ['var(--accent)', 'var(--button-bg)'],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
    },
    animation: {
      duration: 1000,
      easing: 'easeOutBounce',
    },
  };

  // Static data for Content Overview tables
  const gamesData = [
    { id: 1, name: 'Sikh Trivia', category: 'Educational', status: 'Active' },
    { id: 2, name: 'Gurbani Puzzle', category: 'Puzzle', status: 'Draft' },
  ];

  const quizzesData = [
    { id: 1, name: 'Sikh History Quiz', questions: 20, status: 'Published' },
    { id: 2, name: 'Gurbani Quiz', questions: 15, status: 'Draft' },
  ];

  const learningMaterialData = [
    { id: 1, title: 'Sikhism Basics', type: 'PDF', status: 'Active' },
    { id: 2, title: 'Guru Nanak Teachings', type: 'Video', status: 'Pending' },
  ];

  // Static data for Gurbani Material tables
  const gurbaniAudioData = [
    { id: 1, title: 'Japji Sahib', type: 'Audio', status: 'Published' },
    { id: 2, title: 'Rehras Sahib', type: 'Audio', status: 'Draft' },
    { id: 3, title: 'Kirtan Sohila', type: 'Audio', status: 'Active' },
    { id: 4, title: 'Anand Sahib', type: 'Audio', status: 'Pending' },
  ];

  const gurbaniTextData = [
    { id: 1, title: 'Sukhmani Sahib', type: 'Text', status: 'Published' },
    { id: 2, title: 'Asa Di Var', type: 'Text', status: 'Draft' },
    { id: 3, title: 'Barah Maha', type: 'Text', status: 'Active' },
    { id: 4, title: 'Shabad Hazare', type: 'Text', status: 'Pending' },
  ];

  const gurbaniVideoData = [
    { id: 1, title: 'Gurbani Kirtan', type: 'Video', status: 'Published' },
    { id: 2, title: 'Nitnem Path', type: 'Video', status: 'Draft' },
    { id: 3, title: 'Ardas Explanation', type: 'Video', status: 'Active' },
    { id: 4, title: 'Gurbani Katha', type: 'Video', status: 'Pending' },
  ];

  // Static data for Sikh History Content tables
  const sikhHistoryArticlesData = [
    { id: 1, title: 'Battle of Chamkaur', type: 'Article', status: 'Active' },
    { id: 2, title: 'Guru Gobind Singh', type: 'Article', status: 'Published' },
    { id: 3, title: 'Khalsa Formation', type: 'Article', status: 'Draft' },
    { id: 4, title: 'Sikh Martyrs', type: 'Article', status: 'Pending' },
  ];

  const sikhHistoryVideosData = [
    { id: 1, title: 'Guru Nanak Dev Ji', type: 'Video', status: 'Published' },
    { id: 2, title: 'Banda Singh Bahadur', type: 'Video', status: 'Active' },
    { id: 3, title: 'Sikh Empire', type: 'Video', status: 'Draft' },
    { id: 4, title: 'Golden Temple History', type: 'Video', status: 'Pending' },
  ];

  const sikhHistoryPodcastsData = [
    { id: 1, title: 'Sikh History Podcast Ep1', type: 'Podcast', status: 'Published' },
    { id: 2, title: 'Guru Tegh Bahadur', type: 'Podcast', status: 'Active' },
    { id: 3, title: 'Vaisakhi 1699', type: 'Podcast', status: 'Draft' },
    { id: 4, title: 'Sikh Women in History', type: 'Podcast', status: 'Pending' },
  ];

  const handleDelete = (id, category) => {
    alert(`Delete item ${id} from ${category}`);
    // Implement actual delete logic here
  };

  const renderTable = (data, category) => (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id} className={styles.tableRow}>
            <td>{item.name || item.title}</td>
            <td>{item.type}</td>
            <td>{item.status}</td>
            <td>
              <button
                className={styles.deleteButton}
                onClick={() => handleDelete(item.id, category)}
              >
                <FaEllipsisV />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className={styles.page}>
      <h1>Dashboard</h1>

      {/* Gradient Cards */}
      <div className={styles.cardContainer}>
        {cardData.map((card, index) => (
          <div key={index} className={styles.card}>
            <h3>{card.title}</h3>
            <p>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Pie Charts */}
      <div className={styles.chartContainer}>
        <div className={styles.chart}>
          <h3>Users Ratio</h3>
          <div className={styles.chartWrapper}>
            <Pie data={userChartData} options={chartOptions} />
          </div>
        </div>
        <div className={styles.chart}>
          <h3>Books Ratio</h3>
          <div className={styles.chartWrapper}>
            <Pie data={bookChartData} options={chartOptions} />
          </div>
        </div>
        <div className={styles.chart}>
          <h3>Audiobooks Ratio</h3>
          <div className={styles.chartWrapper}>
            <Pie data={audiobookChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Tabs and Tables for Games, Quizzes, Learning Material */}
      <div className={styles.tabSection}>
        <h2>Content Overview</h2>
        <div className={styles.tabContainer}>
          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabButton} ${activeTab === 'games' ? styles.active : ''}`}
              onClick={() => setActiveTab('games')}
            >
              Games
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'quizzes' ? styles.active : ''}`}
              onClick={() => setActiveTab('quizzes')}
            >
              Quizzes
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'learning' ? styles.active : ''}`}
              onClick={() => setActiveTab('learning')}
            >
              Learning Material
            </button>
          </div>
          <select
            className={styles.tabDropdown}
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            <option value="games">Games</option>
            <option value="quizzes">Quizzes</option>
            <option value="learning">Learning Material</option>
          </select>
          <div className={styles.tabContent}>
            {activeTab === 'games' && renderTable(gamesData, 'games')}
            {activeTab === 'quizzes' && renderTable(quizzesData, 'quizzes')}
            {activeTab === 'learning' && renderTable(learningMaterialData, 'learning')}
          </div>
        </div>
      </div>

      {/* Tabs and Tables for Gurbani Material */}
      <div className={styles.tabSection}>
        <h2>Gurbani Material</h2>
        <div className={styles.tabContainer}>
          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabButton} ${activeGurbaniTab === 'audio' ? styles.active : ''}`}
              onClick={() => setActiveGurbaniTab('audio')}
            >
              Audio
            </button>
            <button
              className={`${styles.tabButton} ${activeGurbaniTab === 'text' ? styles.active : ''}`}
              onClick={() => setActiveGurbaniTab('text')}
            >
              Text
            </button>
            <button
              className={`${styles.tabButton} ${activeGurbaniTab === 'video' ? styles.active : ''}`}
              onClick={() => setActiveGurbaniTab('video')}
            >
              Video
            </button>
          </div>
          <select
            className={styles.tabDropdown}
            value={activeGurbaniTab}
            onChange={(e) => setActiveGurbaniTab(e.target.value)}
          >
            <option value="audio">Audio</option>
            <option value="text">Text</option>
            <option value="video">Video</option>
          </select>
          <div className={styles.tabContent}>
            {activeGurbaniTab === 'audio' && renderTable(gurbaniAudioData, 'gurbani-audio')}
            {activeGurbaniTab === 'text' && renderTable(gurbaniTextData, 'gurbani-text')}
            {activeGurbaniTab === 'video' && renderTable(gurbaniVideoData, 'gurbani-video')}
          </div>
        </div>
      </div>

      {/* Tabs and Tables for Sikh History Content */}
      <div className={styles.tabSection}>
        <h2>Sikh History Content</h2>
        <div className={styles.tabContainer}>
          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabButton} ${activeSikhHistoryTab === 'articles' ? styles.active : ''}`}
              onClick={() => setActiveSikhHistoryTab('articles')}
            >
              Articles
            </button>
            <button
              className={`${styles.tabButton} ${activeSikhHistoryTab === 'videos' ? styles.active : ''}`}
              onClick={() => setActiveSikhHistoryTab('videos')}
            >
              Videos
            </button>
            <button
              className={`${styles.tabButton} ${activeSikhHistoryTab === 'podcasts' ? styles.active : ''}`}
              onClick={() => setActiveSikhHistoryTab('podcasts')}
            >
              Podcasts
            </button>
          </div>
          <select
            className={styles.tabDropdown}
            value={activeSikhHistoryTab}
            onChange={(e) => setActiveSikhHistoryTab(e.target.value)}
          >
            <option value="articles">Articles</option>
            <option value="videos">Videos</option>
            <option value="podcasts">Podcasts</option>
          </select>
          <div className={styles.tabContent}>
            {activeSikhHistoryTab === 'articles' && renderTable(sikhHistoryArticlesData, 'sikh-history-articles')}
            {activeSikhHistoryTab === 'videos' && renderTable(sikhHistoryVideosData, 'sikh-history-videos')}
            {activeSikhHistoryTab === 'podcasts' && renderTable(sikhHistoryPodcastsData, 'sikh-history-podcasts')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;