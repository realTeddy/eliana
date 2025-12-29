import './style.css';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (appRoot) {
  appRoot.innerHTML = `
    <div id="rsvp-page">
      <div class="tech-corner top-left"></div>
      <div class="tech-corner top-right"></div>
      <div class="tech-corner bottom-left"></div>
      <div class="tech-corner bottom-right"></div>
      <div id="content" class="rsvp-content">
        <h2>RSVP Overview</h2>
        <p class="details">Who's rolling out to Eliana's 5th birthday party?</p>
        
        <div class="rsvp-stats">
          <div class="stat-box">
            <span class="stat-number" id="total-families">0</span>
            <span class="stat-label">Families</span>
          </div>
          <div class="stat-box highlight">
            <span class="stat-number" id="total-kids">0</span>
            <span class="stat-label">Kids Coming</span>
          </div>
        </div>

        <div class="rsvp-grid">
          <section class="rsvp-section">
            <h3 class="rsvp-heading confirmed">Coming 🎉</h3>
            <ul id="confirmed-list" class="rsvp-list"></ul>
          </section>
          <section class="rsvp-section">
            <h3 class="rsvp-heading denied">Can't Make It 💙</h3>
            <ul id="denied-list" class="rsvp-list"></ul>
          </section>
          <section class="rsvp-section">
            <h3 class="rsvp-heading pending">Pending ⏳</h3>
            <ul id="pending-list" class="rsvp-list"></ul>
          </section>
        </div>
        <p id="rsvp-loading" class="details subtle">Loading RSVP data...</p>
      </div>
    </div>
  `;
}

// Firebase configuration (same as main page)
const firebaseConfig = {
  apiKey: 'AIzaSyDVtvC1ZckIGbySOzXcxL9HmEoShOJqVrE',
  authDomain: 'eliana-tewodros.firebaseapp.com',
  projectId: 'eliana-tewodros',
  storageBucket: 'eliana-tewodros.firebasestorage.app',
  messagingSenderId: '995428783429',
  appId: '1:995428783429:web:ab1e03bf9fef877d64da2c',
  measurementId: 'G-YE1DQ71S4F',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function loadRsvps() {
  const loadingEl = document.getElementById('rsvp-loading');
  const confirmedList = document.getElementById('confirmed-list');
  const deniedList = document.getElementById('denied-list');
  const pendingList = document.getElementById('pending-list');
  const totalFamiliesEl = document.getElementById('total-families');
  const totalKidsEl = document.getElementById('total-kids');

  if (!confirmedList || !deniedList || !loadingEl) return;

  try {
    const snapshot = await getDocs(collection(db, 'invites'));

    type Entry = {
      name: string;
      walkIn?: boolean;
      kidsCount?: number;
      createdAt?: string;
    };

    const confirmed: Entry[] = [];
    const denied: Entry[] = [];
    const pending: Entry[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const name = (data && data.name) || 'Guest';
      const entry: Entry = {
        name,
        walkIn: data?.walkIn,
        kidsCount: data?.kidsCount || 1,
        createdAt: data?.createdAt,
      };

      if (data?.status === 'confirmed') {
        confirmed.push(entry);
      } else if (data?.status === 'denied') {
        denied.push(entry);
      } else {
        // No status means invite sent but not responded
        pending.push(entry);
      }
    });

    // Sort by createdAt (newest first) or name as fallback
    const byDate = (a: Entry, b: Entry) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.name.localeCompare(b.name);
    };
    confirmed.sort(byDate);
    denied.sort(byDate);
    pending.sort((a, b) => a.name.localeCompare(b.name));

    // Calculate totals
    const totalKids = confirmed.reduce((sum, e) => sum + (e.kidsCount || 1), 0);
    if (totalFamiliesEl) totalFamiliesEl.textContent = String(confirmed.length);
    if (totalKidsEl) totalKidsEl.textContent = String(totalKids);

    const renderList = (container: HTMLElement, items: Entry[], emptyText: string, showKids: boolean) => {
      container.innerHTML = '';
      if (!items.length) {
        const li = document.createElement('li');
        li.className = 'rsvp-empty';
        li.textContent = emptyText;
        container.appendChild(li);
        return;
      }

      for (const item of items) {
        const li = document.createElement('li');
        li.className = 'rsvp-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'rsvp-name';
        nameSpan.textContent = item.name;

        const tagsContainer = document.createElement('span');
        tagsContainer.className = 'rsvp-tags';

        if (showKids && item.kidsCount) {
          const kidsSpan = document.createElement('span');
          kidsSpan.className = 'rsvp-tag kids';
          kidsSpan.textContent = `${item.kidsCount} kid${item.kidsCount > 1 ? 's' : ''}`;
          tagsContainer.appendChild(kidsSpan);
        }

        if (item.walkIn) {
          const walkInSpan = document.createElement('span');
          walkInSpan.className = 'rsvp-tag walkin';
          walkInSpan.textContent = 'walk-in';
          tagsContainer.appendChild(walkInSpan);
        }

        li.appendChild(nameSpan);
        li.appendChild(tagsContainer);
        container.appendChild(li);
      }
    };

    renderList(confirmedList, confirmed, 'No confirmed guests yet.', true);
    renderList(deniedList, denied, 'No declines yet.', false);
    if (pendingList) {
      renderList(pendingList, pending, 'All invites responded!', false);
    }

    loadingEl.textContent = '';
  } catch (err) {
    console.error('Error loading RSVPs', err);
    loadingEl.textContent = 'Error loading RSVP data. Please try again later.';
  }
}

loadRsvps();
