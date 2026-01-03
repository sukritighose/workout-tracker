
        document.addEventListener('DOMContentLoaded', () => {
            // --- CONFIGURATION ---
            const CLASS_PASS_LIMIT = 26;
            const SOLIDCORE_LIMIT = 5;
            const RESET_DAY = 22;
            const STORAGE_KEY = 'workoutHistory';

            // --- DOM ELEMENTS ---
            const inputPage = document.getElementById('input-page');
            const wrappedPage = document.getElementById('wrapped-page');
            const historyPage = document.getElementById('history-page');
            const viewWrappedBtn = document.getElementById('view-wrapped-btn');
            const viewHistoryBtn = document.getElementById('view-history-btn');
            const backBtns = document.querySelectorAll('.back-btn');
            const logButton = document.getElementById('log-button');
            const usageInput = document.getElementById('usage-input');
            const dateInput = document.getElementById('date-input');
            const classpassRemainingEl = document.getElementById('classpass-remaining');
            const solidcoreRemainingEl = document.getElementById('solidcore-remaining');
            const cycleDatesEl = document.getElementById('cycle-dates');
            const progressBarInnerEl = document.getElementById('progress-bar-inner');
            const wrappedContentEl = document.getElementById('wrapped-content');
            const historyListContainer = document.getElementById('history-list-container');
            const buttonContainer = document.querySelector('div[style*="position: fixed"]');

            // --- PAGE MANAGEMENT ---
            function showPage(pageToShow) {
                [inputPage, wrappedPage, historyPage].forEach(page => {
                    page.style.display = page === pageToShow ? 'flex' : 'none';
                });
                buttonContainer.style.display = pageToShow === inputPage ? 'flex' : 'none';
            }

            // --- DATE & HISTORY FUNCTIONS ---
            function getCycleStartDate(date) {
                const year = date.getFullYear();
                const month = date.getMonth();
                if (date.getDate() >= RESET_DAY) return new Date(year, month, RESET_DAY);
                const lastMonth = new Date(date);
                lastMonth.setDate(1);
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                return new Date(lastMonth.getFullYear(), lastMonth.getMonth(), RESET_DAY);
            }

            function getHistory() {
                return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            }

            function saveHistory(history) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
                updateUI(); // This is the key: always update the main page UI after any history change.
            }

            // --- UI RENDERING ---
            function updateUI() {
                const history = getHistory();
                const today = new Date();
                const currentCycleStartDate = getCycleStartDate(today);

                // --- Rollover Calculation ---
                let rolloverForCurrentCycle = 0;
                if (history.length > 0) {
                    history.sort((a, b) => new Date(a.date) - new Date(b.date));
                    const firstEntryDate = new Date(history[0].date);
                    let loopCycleStartDate = getCycleStartDate(firstEntryDate);
                    
                    let rolloverForNextCycle = 0;

                    // Loop through all cycles from the first one up to the one *before* the current one
                    while (loopCycleStartDate < currentCycleStartDate) {
                        const loopCycleEndDate = new Date(loopCycleStartDate);
                        loopCycleEndDate.setMonth(loopCycleEndDate.getMonth() + 1);

                        const currentLoopCycleLimit = CLASS_PASS_LIMIT + rolloverForNextCycle;

                        const loopCycleEntries = history.filter(entry => {
                            const entryDate = new Date(entry.date);
                            return entryDate >= loopCycleStartDate && entryDate < loopCycleEndDate;
                        });

                        const loopCycleClassPassUsed = loopCycleEntries
                            .filter(e => e.type === 'classpass')
                            .reduce((sum, e) => sum + e.amount, 0);
                        
                        const leftover = currentLoopCycleLimit - loopCycleClassPassUsed;
                        rolloverForNextCycle = Math.min(26, Math.max(0, leftover));
                        
                        // Move to the next cycle for the next iteration
                        loopCycleStartDate.setMonth(loopCycleStartDate.getMonth() + 1);
                    }
                    rolloverForCurrentCycle = rolloverForNextCycle;
                }

                // --- Current Cycle Calculation ---
                const currentClassPassLimit = CLASS_PASS_LIMIT + rolloverForCurrentCycle;
                const cycleEndDate = new Date(currentCycleStartDate);
                cycleEndDate.setMonth(cycleEndDate.getMonth() + 1);

                const currentCycleEntries = history.filter(entry => {
                    const entryDate = new Date(entry.date);
                    return entryDate >= currentCycleStartDate && entryDate < cycleEndDate;
                });

                let classPassUsed = currentCycleEntries.filter(e => e.type === 'classpass').reduce((sum, e) => sum + e.amount, 0);
                let solidcoreUsed = currentCycleEntries.filter(e => e.type === 'solidcore').reduce((sum, e) => sum + e.amount, 0);

                classpassRemainingEl.textContent = currentClassPassLimit - classPassUsed;
                solidcoreRemainingEl.textContent = SOLIDCORE_LIMIT - solidcoreUsed;

                // --- Progress Bar & Date Display ---
                const totalDuration = cycleEndDate.getTime() - currentCycleStartDate.getTime();
                const elapsedDuration = today.getTime() - currentCycleStartDate.getTime();
                let progress = (elapsedDuration / totalDuration) * 100;
                progressBarInnerEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;

                const options = { month: 'short', day: 'numeric' };
                cycleDatesEl.textContent = `Current Cycle: ${currentCycleStartDate.toLocaleDateString(undefined, options)} - ${cycleEndDate.toLocaleDateString(undefined, options)}`;
            }
            
            // FIX: Improved text and structure
            function renderHistoryPage() {
                const history = getHistory().slice().reverse(); // Show newest first
                if (history.length === 0) {
                    historyListContainer.innerHTML = "<p>No workouts logged yet.</p>";
                    return;
                }
                historyListContainer.innerHTML = `<ul>${history.map(entry => {
                    const entryText = entry.type === 'classpass' ? 'ClassPass credits' : 'Solidcore classes';
                    const d = new Date(entry.date);
                    // Using UTC date components to avoid timezone-related "off-by-one" errors.
                    const displayDate = `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
                    return `
                    <li class="history-item" data-id="${entry.id}">
                        <div class="history-item-info">
                            <span><strong>${entry.amount}</strong> ${entryText}</span>
                            <small>${displayDate}</small>
                        </div>
                        <div class="history-item-actions">
                            <button class="edit-btn" data-id="${entry.id}">✏️</button>
                            <button class="delete-btn" data-id="${entry.id}">🗑️</button>
                        </div>
                    </li>
                `}).join('')}</ul>`;
            }
            
            // --- ACTION HANDLERS ---
            function logUsage() {
                const type = document.querySelector('input[name="workout-type"]:checked').value;
                const amount = parseInt(usageInput.value, 10);
                const dateValue = dateInput.value;

                if (!amount || amount <= 0) {
                    alert("Please enter a valid positive number.");
                    return;
                }
                if (!dateValue) {
                    alert("Please select a date.");
                    return;
                }
                const entryDate = new Date(dateValue + 'T00:00:00').toISOString();

                const history = getHistory();
                history.push({
                    id: Date.now(), // Unique ID for editing/deleting
                    date: entryDate,
                    type: type,
                    amount: amount,
                });
                saveHistory(history);
                usageInput.value = '';
                dateInput.valueAsDate = new Date();
            }

            // FIX: This function now correctly handles all actions.
            function handleHistoryClick(e) {
                const target = e.target;
                const entryId = Number(target.dataset.id);
                if (!entryId) return; // Exit if the clicked element doesn't have an ID

                const listItem = target.closest('.history-item');

                if (target.matches('.delete-btn')) {
                    if (confirm('Are you sure you want to delete this entry?')) {
                        let history = getHistory();
                        history = history.filter(entry => entry.id !== entryId);
                        saveHistory(history);
                        renderHistoryPage(); // Re-render the history page immediately
                    }
                } else if (target.matches('.edit-btn')) {
                    const history = getHistory();
                    const entry = history.find(e => e.id === entryId);
                    const entryDate = new Date(entry.date).toISOString().split('T')[0];
                    listItem.innerHTML = `
                        <div class="history-item-info">
                            <input type="number" value="${entry.amount}" class="edit-amount-input" style="width: 50px; padding: 5px;"/>
                            <select class="edit-type-select" style="padding: 5px;">
                                <option value="classpass" ${entry.type === 'classpass' ? 'selected' : ''}>ClassPass</option>
                                <option value="solidcore" ${entry.type === 'solidcore' ? 'selected' : ''}>Solidcore</option>
                            </select>
                            <input type="date" value="${entryDate}" class="edit-date-input" style="padding: 5px;"/>
                        </div>
                        <div class="history-item-actions">
                            <button class="save-btn" data-id="${entry.id}">✅</button>
                        </div>`;
                } else if (target.matches('.save-btn')) {
                    const newAmount = parseInt(listItem.querySelector('.edit-amount-input').value, 10);
                    const newType = listItem.querySelector('.edit-type-select').value;
                    const newDate = listItem.querySelector('.edit-date-input').value;
                    
                    if (!newAmount || newAmount <= 0) {
                        alert("Please enter a valid positive number.");
                        return;
                    }
                    if (!newDate) {
                        alert("Please select a date.");
                        return;
                    }
                    let history = getHistory();
                    const entryIndex = history.findIndex(e => e.id === entryId);
                    if (entryIndex > -1) {
                        history[entryIndex].amount = newAmount;
                        history[entryIndex].type = newType;
                        history[entryIndex].date = new Date(newDate + 'T00:00:00').toISOString();
                        saveHistory(history);
                        renderHistoryPage(); // Re-render after saving
                    }
                }
            }
            
            function generateWrapped() {
                const history = getHistory();
                const calendarContainer = document.getElementById('calendar-container');
                const statsContainer = document.getElementById('stats-container');

                // Clear previous content
                calendarContainer.innerHTML = '';
                statsContainer.innerHTML = '';

                if (history.length === 0) {
                    statsContainer.innerHTML = "<p>No workouts logged yet. Start logging to see your summary!</p>";
                    return;
                }

                // --- CALENDAR GENERATION ---
                const entriesByMonth = {};
                const workoutDates = new Set();
                history.forEach(entry => {
                    const d = new Date(entry.date);
                    // Use UTC date to be consistent with how dates are displayed in history
                    const year = d.getUTCFullYear();
                    const month = d.getUTCMonth();
                    const day = d.getUTCDate();
                    
                    const monthKey = `${year}-${month}`;
                    if (!entriesByMonth[monthKey]) {
                        entriesByMonth[monthKey] = new Date(year, month, 1);
                    }
                    workoutDates.add(`${year}-${month}-${day}`);
                });

                const sortedMonthKeys = Object.keys(entriesByMonth).sort((a, b) => {
                    const [yearA, monthA] = a.split('-').map(Number);
                    const [yearB, monthB] = b.split('-').map(Number);
                    if (yearA !== yearB) return yearB - yearA;
                    return monthB - monthA;
                });
                
                sortedMonthKeys.forEach(monthKey => {
                    const dateForMonth = entriesByMonth[monthKey];
                    const year = dateForMonth.getFullYear();
                    const month = dateForMonth.getMonth();

                    const monthName = dateForMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

                    let calendarHtml = `<div class="calendar-header">${monthName}</div>`;
                    calendarHtml += '<table class="calendar">';
                    calendarHtml += '<thead><tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr></thead>';
                    calendarHtml += '<tbody>';

                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    
                    let date = 1;
                    for (let i = 0; i < 6; i++) {
                        calendarHtml += '<tr>';
                        for (let j = 0; j < 7; j++) {
                            if (i === 0 && j < firstDay) {
                                calendarHtml += '<td class="empty-day"></td>';
                            } else if (date > daysInMonth) {
                                calendarHtml += '<td class="empty-day"></td>';
                            } else {
                                const dayKey = `${year}-${month}-${date}`;
                                const hasClass = workoutDates.has(dayKey) ? 'day-with-class' : '';
                                calendarHtml += `<td><div class="calendar-day ${hasClass}">${date}</div></td>`;
                                date++;
                            }
                        }
                        calendarHtml += '</tr>';
                        if (date > daysInMonth) {
                            break;
                        }
                    }
                    calendarHtml += '</tbody></table>';
                    calendarContainer.innerHTML += calendarHtml;
                });

                // --- YTD Calculation ---
                const ytdStartDate = new Date('2025-12-22T00:00:00');
                const ytdHistory = history.filter(entry => new Date(entry.date) >= ytdStartDate);

                let ytdHtml = '';
                // Only show YTD if there are entries in that period
                if (ytdHistory.length > 0) {
                    let ytdTotalCredits = ytdHistory.filter(e => e.type === 'classpass').reduce((sum, e) => sum + e.amount, 0);
                    let ytdTotalClasses = ytdHistory.filter(e => e.type === 'solidcore').reduce((sum, e) => sum + e.amount, 0);

                    ytdHtml = `
                        <div class="ytd-summary">
                            <h3>Year to Date (since Dec 22, 2025)</h3>
                            <p><strong>Total ClassPass Credits Used:</strong> ${ytdTotalCredits}</p>
                            <p><strong>Total Solidcore Classes Taken:</strong> ${ytdTotalClasses}</p>
                        </div>
                    `;
                }

                // --- Cycle-by-Cycle Logic ---
                const cycles = {};
                history.forEach(entry => {
                    const entryDate = new Date(entry.date);
                    const cycleStartDate = getCycleStartDate(entryDate);
                    const cycleStartDateString = cycleStartDate.toISOString();

                    if (!cycles[cycleStartDateString]) {
                        const cycleEndDate = new Date(cycleStartDate);
                        cycleEndDate.setMonth(cycleEndDate.getMonth() + 1);
                        cycles[cycleStartDateString] = {
                            startDate: cycleStartDate,
                            endDate: cycleEndDate,
                            entries: []
                        };
                    }
                    cycles[cycleStartDateString].entries.push(entry);
                });

                const sortedCycleKeys = Object.keys(cycles).sort((a, b) => new Date(b) - new Date(a));

                let cyclesHtml = '';
                if (sortedCycleKeys.length > 0) {
                    cyclesHtml = sortedCycleKeys.map(cycleKey => {
                        const cycle = cycles[cycleKey];
                        const { startDate, endDate, entries } = cycle;

                        let totalCredits = entries.filter(e => e.type === 'classpass').reduce((sum, e) => sum + e.amount, 0);
                        let totalClasses = entries.filter(e => e.type === 'solidcore').reduce((sum, e) => sum + e.amount, 0);

                        const options = { month: 'short', day: 'numeric', year: 'numeric' };
                        const cycleTitle = `Cycle: ${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

                        return `
                            <div class="cycle-summary">
                                <h3>${cycleTitle}</h3>
                                <p><strong>Total ClassPass Credits Used:</strong> ${totalCredits}</p>
                                <p><strong>Total Solidcore Classes Taken:</strong> ${totalClasses}</p>
                            </div>
                        `;
                    }).join('');
                }
                
                // Append YTD and cycle stats to statsContainer
                statsContainer.innerHTML = ytdHtml + cyclesHtml;
            }

            // --- EVENT LISTENERS ---
            logButton.addEventListener('click', logUsage);
            
            viewWrappedBtn.addEventListener('click', () => {
                generateWrapped();
                showPage(wrappedPage);
            });

            viewHistoryBtn.addEventListener('click', () => {
                renderHistoryPage();
                showPage(historyPage);
            });

            backBtns.forEach(btn => btn.addEventListener('click', () => showPage(inputPage)));
            
            historyListContainer.addEventListener('click', handleHistoryClick);
            
            // --- INITIALIZE THE APP ---
            showPage(inputPage); // Start on the input page
            updateUI();
            dateInput.valueAsDate = new Date();
        });
    