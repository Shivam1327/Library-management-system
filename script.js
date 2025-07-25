document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const viewButtons = document.querySelectorAll('.menu button');
    const views = document.querySelectorAll('.view');
    const addBookForm = document.getElementById('addBookForm');
    const booksTableBody = document.getElementById('booksTableBody');
    const bookSearch = document.getElementById('bookSearch');
    const searchBookBtn = document.getElementById('searchBookBtn');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const memberModal = document.getElementById('memberModal');
    const closeModalBtn = document.querySelector('.close-btn');
    const addMemberForm = document.getElementById('addMemberForm');
    const membersTableBody = document.getElementById('membersTableBody');
    const checkoutForm = document.getElementById('checkoutForm');
    const checkinForm = document.getElementById('checkinForm');
    const memberSelect = document.getElementById('memberSelect');
    const bookSelect = document.getElementById('bookSelect');
    const checkinBookSelect = document.getElementById('checkinBookSelect');
    const activityLog = document.getElementById('activityLog');
    
    // Statistics elements
    const totalBooksEl = document.getElementById('totalBooks');
    const availableBooksEl = document.getElementById('availablrbooks');
    const checkedOutEl = document.getElementById('checkedOut');
    
    // Initialize data
    let books = JSON.parse(localStorage.getItem('libraryBooks')) || [];
    let members = JSON.parse(localStorage.getItem('libraryMembers')) || [];
    let transactions = JSON.parse(localStorage.getItem('libraryTransactions')) || [];
    let activityLogs = JSON.parse(localStorage.getItem('libraryActivityLogs')) || [];
    
    // Initialize Chart
    let booksChart;
    
    // Switch between views
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            viewButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Hide all views
            views.forEach(view => view.classList.remove('active-view'));
            
            // Show the corresponding view
            const viewId = this.id.replace('Btn', 'View');
            document.getElementById(viewId).classList.add('active-view');
            
            // Update data if needed
            if (viewId === 'dashboardView') {
                updateDashboard();
            } else if (viewId === 'booksView') {
                renderBooksTable();
            } else if (viewId === 'membersView') {
                renderMembersTable();
            } else if (viewId === 'checkoutView') {
                updateMemberSelect();
                updateBookSelect();
                updateCheckinBookSelect();
            }
        });
    });
    
    // Add new book
    addBookForm.addEventListener('submit', function {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const author = document.getElementById('author').value;
        const isbn = document.getElementById('isbn').value;
        const quantity = parseInt(document.getElementById('quantity').value);
        
        // Check if book with same ISBN already exists
        const existingBookIndex = books.findIndex(book => book.isbn === isbn);
        
        if (existingBookIndex !== -1) {
            // Update quantity if book exists
            books[existingBookIndex].quantity += quantity;
            books[existingBookIndex].available += quantity;
            addActivityLog(`Updated quantity for "${title}" (Added ${quantity} copies)`);
        } else {
            // Add new book
            const newBook = {
                id: generateId(),
                title,
                author,
                isbn,
                quantity,
                available: quantity,
                checkedOutBy: []
            };
            books.push(newBook);
            addActivityLog(`Added new book "${title}" by ${author}`);
        }
        
        // Save to localStorage
        saveData();
        
        // Reset form
        this.reset();
        
        // Update UI
        renderBooksTable();
        updateDashboard();
        
        // Show success message
        alert('Book added successfully!');
    });
    
    // Search books
    searchBookBtn.addEventListener('click', function() {
        renderBooksTable(bookSearch.value);
    });
    
    bookSearch.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            renderBooksTable(bookSearch.value);
        }
    });
    
    // Add member modal
    addMemberBtn.addEventListener('click', function() {
        memberModal.style.display = 'flex';
    });
    
    closeModalBtn.addEventListener('click', function() {
        memberModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === memberModal) {
            memberModal.style.display = 'none';
        }
    });
    
    // Add new member
    addMemberForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('memberName').value;
        const email = document.getElementById('memberEmail').value;
        const phone = document.getElementById('memberPhone').value;
        
        const newMember = {
            id: generateId(),
            name,
            email,
            phone,
            booksBorrowed: []
        };
        
        members.push(newMember);
        addActivityLog(`Added new member: ${name}`);
        
        // Save to localStorage
        saveData();
        
        // Reset form and close modal
        this.reset();
        memberModal.style.display = 'none';
        
        // Update UI
        renderMembersTable();
        updateMemberSelect();
        
        // Show success message
        alert('Member added successfully!');
    });
    
    // Check out book
    checkoutForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const memberId = memberSelect.value;
        const bookId = bookSelect.value;
        
        if (!memberId || !bookId) {
            alert('Please select both a member and a book');
            return;
        }
        
        const member = members.find(m => m.id === memberId);
        const book = books.find(b => b.id === bookId);
        
        if (book.available <= 0) {
            alert('This book is not available for checkout');
            return;
        }
        
        // Update book status
        book.available--;
        book.checkedOutBy.push({
            memberId: member.id,
            checkoutDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
        });
        
        // Update member's borrowed books
        member.booksBorrowed.push({
            bookId: book.id,
            checkoutDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        // Record transaction
        const transaction = {
            id: generateId(),
            type: 'checkout',
            memberId: member.id,
            bookId: book.id,
            date: new Date().toISOString()
        };
        transactions.push(transaction);
        
        addActivityLog(`Checked out "${book.title}" to ${member.name}`);
        
        // Save to localStorage
        saveData();
        
        // Reset form
        this.reset();
        
        // Update UI
        updateDashboard();
        renderBooksTable();
        renderMembersTable();
        updateBookSelect();
        updateCheckinBookSelect();
        
        // Show success message
        alert(`Book checked out successfully to ${member.name}`);
    });
    
    // Check in book
    checkinForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const bookId = checkinBookSelect.value;
        
        if (!bookId) {
            alert('Please select a book to check in');
            return;
        }
        
        const book = books.find(b => b.id === bookId);
        const checkoutRecord = book.checkedOutBy[book.checkedOutBy.length - 1];
        const member = members.find(m => m.id === checkoutRecord.memberId);
        
        if (!member) {
            alert('Error: Member not found');
            return;
        }
        
        // Update book status
        book.available++;
        
        // Remove from member's borrowed books
        member.booksBorrowed = member.booksBorrowed.filter(b => b.bookId !== book.id);
        
        // Update checkout record with return date
        checkoutRecord.returnDate = new Date().toISOString();
        
        // Record transaction
        const transaction = {
            id: generateId(),
            type: 'checkin',
            memberId: member.id,
            bookId: book.id,
            date: new Date().toISOString()
        };
        transactions.push(transaction);
        
        addActivityLog(`Checked in "${book.title}" from ${member.name}`);
        
        // Save to localStorage
        saveData();
        
        // Reset form
        this.reset();
        
        // Update UI
        updateDashboard();
        renderBooksTable();
        renderMembersTable();
        updateBookSelect();
        updateCheckinBookSelect();
        
        // Show success message
        alert(`Book checked in successfully from ${member.name}`);
    });
    
    // Initialize the app
    function init() {
        // Add some sample data if empty
        if (books.length === 0) {
            books = [
                {
                    id: generateId(),
                    title: 'The Great Gatsby',
                    author: 'F. Scott Fitzgerald',
                    isbn: '9780743273565',
                    quantity: 5,
                    available: 5,
                    checkedOutBy: []
                },
                {
                    id: generateId(),
                    title: 'To Kill a Mockingbird',
                    author: 'Harper Lee',
                    isbn: '9780061120084',
                    quantity: 3,
                    available: 3,
                    checkedOutBy: []
                },
                {
                    id: generateId(),
                    title: '1984',
                    author: 'George Orwell',
                    isbn: '9780451524935',
                    quantity: 4,
                    available: 2,
                    checkedOutBy: [
                        {
                            memberId: 'mem-001',
                            checkoutDate: '2023-05-15T00:00:00Z',
                            dueDate: '2023-05-29T00:00:00Z'
                        },
                        {
                            memberId: 'mem-001',
                            checkoutDate: '2023-06-10T00:00:00Z',
                            dueDate: '2023-06-24T00:00:00Z'
                        }
                    ]
                }
            ];
            saveData();
        }
        
        if (members.length === 0) {
            members = [
                {
                    id: 'mem-001',
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '555-123-4567',
                    booksBorrowed: [
                        {
                            bookId: books[2].id,
                            checkoutDate: '2023-06-10T00:00:00Z',
                            dueDate: '2023-06-24T00:00:00Z'
                        }
                    ]
                },
                {
                    id: generateId(),
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    phone: '555-987-6543',
                    booksBorrowed: []
                }
            ];
            saveData();
        }
        
        if (activityLogs.length === 0) {
            activityLogs = [
                { id: generateId(), message: 'System initialized', timestamp: new Date().toISOString() },
                { id: generateId(), message: 'Sample data loaded', timestamp: new Date().toISOString() }
            ];
            saveData();
        }
        
        // Initial render
        renderBooksTable();
        renderMembersTable();
        updateMemberSelect();
        updateBookSelect();
        updateCheckinBookSelect();
        renderActivityLog();
        updateDashboard();
    }
    
    // Render books table
    function renderBooksTable(searchTerm = '') {
        booksTableBody.innerHTML = '';
        
        const filteredBooks = searchTerm 
            ? books.filter(book => 
                book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                book.author.toLowerCase().includes(searchTerm.toLowerCase()) || 
                book.isbn.includes(searchTerm))
            : books;
        
        if (filteredBooks.length === 0) {
            booksTableBody.innerHTML = '<tr><td colspan="5" class="no-results">No books found</td></tr>';
            return;
        }
        
        filteredBooks.forEach(book => {
            const row = document.createElement('tr');
            
            // Calculate status
            const status = book.available > 0 ? 'available' : 'checked-out';
            const statusText = book.available > 0 
                ? `Available (${book.available}/${book.quantity})` 
                : 'Checked Out';
            
            row.innerHTML = `
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.isbn}</td>
                <td><span class="status ${status}">${statusText}</span></td>
                <td class="action-btns">
                    <button class="btn btn-edit" data-id="${book.id}">Edit</button>
                    <button class="btn btn-delete" data-id="${book.id}">Delete</button>
                </td>
            `;
            
            booksTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const bookId = this.getAttribute('data-id');
                editBook(bookId);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const bookId = this.getAttribute('data-id');
                deleteBook(bookId);
            });
        });
    }
    
    // Render members table
    function renderMembersTable() {
        membersTableBody.innerHTML = '';
        
        if (members.length === 0) {
            membersTableBody.innerHTML = '<tr><td colspan="6" class="no-results">No members found</td></tr>';
            return;
        }
        
        members.forEach(member => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${member.id}</td>
                <td>${member.name}</td>
                <td>${member.email}</td>
                <td>${member.phone}</td>
                <td>${member.booksBorrowed.length}</td>
                <td class="action-btns">
                    <button class="btn btn-edit" data-id="${member.id}">Edit</button>
                    <button class="btn btn-delete" data-id="${member.id}">Delete</button>
                </td>
            `;
            
            membersTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const memberId = this.getAttribute('data-id');
                editMember(memberId);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const memberId = this.getAttribute('data-id');
                deleteMember(memberId);
            });
        });
    }
    
    // Update member select dropdown
    function updateMemberSelect() {
        memberSelect.innerHTML = '<option value="">Select a member</option>';
        
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            memberSelect.appendChild(option);
        });
    }
    
    // Update book select dropdown (only available books)
    function updateBookSelect() {
        bookSelect.innerHTML = '<option value="">Select a book</option>';
        
        books.filter(book => book.available > 0).forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = `${book.title} by ${book.author}`;
            bookSelect.appendChild(option);
        });
    }
    
    // Update checkin book select dropdown (only checked out books)
    function updateCheckinBookSelect() {
        checkinBookSelect.innerHTML = '<option value="">Select a book to check in</option>';
        
        books.filter(book => book.checkedOutBy.length > 0 && 
                           (!book.checkedOutBy[book.checkedOutBy.length - 1].returnDate)).forEach(book => {
            const checkoutRecord = book.checkedOutBy[book.checkedOutBy.length - 1];
            const member = members.find(m => m.id === checkoutRecord.memberId);
            
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = `${book.title} (Checked out by ${member ? member.name : 'Unknown'})`;
            checkinBookSelect.appendChild(option);
        });
    }
    
    // Render activity log
    function renderActivityLog() {
        activityLog.innerHTML = '';
        
        // Sort by timestamp (newest first)
        const sortedLogs = [...activityLogs].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp));
        
        // Show only the last 10 activities
        const recentLogs = sortedLogs.slice(0, 10);
        
        if (recentLogs.length === 0) {
            activityLog.innerHTML = '<li>No recent activity</li>';
            return;
        }
        
        recentLogs.forEach(log => {
            const li = document.createElement('li');
            
            // Format timestamp
            const date = new Date(log.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            li.innerHTML = `
                <i class="fas fa-circle"></i>
                <div>
                    <p>${log.message}</p>
                    <small>${formattedDate}</small>
                </div>
            `;
            
            activityLog.appendChild(li);
        });
    }
    
    // Add activity log entry
    function addActivityLog(message) {
        const logEntry = {
            id: generateId(),
            message,
            timestamp: new Date().toISOString()
        };
        
        activityLogs.unshift(logEntry); // Add to beginning of array
        saveData();
        renderActivityLog();
    }
    
    // Update dashboard statistics and chart
    function updateDashboard() {
        // Calculate statistics
        const totalBooksCount = books.reduce((sum, book) => sum + book.quantity, 0);
        const availableBooksCount = books.reduce((sum, book) => sum + book.available, 0);
        const checkedOutCount = totalBooksCount - availableBooksCount;
        
        // Update statistics display
        totalBooksEl.textContent = totalBooksCount;
        availableBooksEl.textContent = availableBooksCount;
        checkedOutEl.textContent = checkedOutCount;
        
        // Update chart
        updateBooksChart(totalBooksCount, availableBooksCount, checkedOutCount);
    }
    
    // Update books chart
    function updateBooksChart(total, available, checkedOut) {
        const ctx = document.getElementById('booksChart').getContext('2d');
        
        // Destroy previous chart if it exists
        if (booksChart) {
            booksChart.destroy();
        }
        
        booksChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Available', 'Checked Out'],
                datasets: [{
                    data: [available, checkedOut],
                    backgroundColor: [
                        '#4cc9f0',
                        '#f72585'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Books Status',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
    }
    
    // Edit book
    function editBook(bookId) {
        const book = books.find(b => b.id === bookId);
        if (!book) return;
        
        const newTitle = prompt('Enter new title:', book.title);
        if (newTitle === null) return;
        
        const newAuthor = prompt('Enter new author:', book.author);
        if (newAuthor === null) return;
        
        const newIsbn = prompt('Enter new ISBN:', book.isbn);
        if (newIsbn === null) return;
        
        const newQuantity = prompt('Enter new quantity:', book.quantity);
        if (newQuantity === null) return;
        
        // Update book
        book.title = newTitle;
        book.author = newAuthor;
        book.isbn = newIsbn;
        
        // Calculate difference in quantity
        const quantityDiff = parseInt(newQuantity) - book.quantity;
        book.quantity = parseInt(newQuantity);
        book.available += quantityDiff;
        
        addActivityLog(`Updated book details for "${book.title}"`);
        saveData();
        
        // Update UI
        renderBooksTable();
        updateDashboard();
        updateBookSelect();
        updateCheckinBookSelect();
    }
    
    // Delete book
    function deleteBook(bookId) {
        if (!confirm('Are you sure you want to delete this book?')) {
            return;
        }
        
        const bookIndex = books.findIndex(b => b.id === bookId);
        if (bookIndex === -1) return;
        
        const book = books[bookIndex];
        
        // Check if book is checked out
        if (book.quantity !== book.available) {
            alert('Cannot delete book that has checked out copies');
            return;
        }
        
        books.splice(bookIndex, 1);
        addActivityLog(`Deleted book "${book.title}"`);
        saveData();
        
        // Update UI
        renderBooksTable();
        updateDashboard();
        updateBookSelect();
        updateCheckinBookSelect();
    }
    
    // Edit member
    function editMember(memberId) {
        const member = members.find(m => m.id === memberId);
        if (!member) return;
        
        const newName = prompt('Enter new name:', member.name);
        if (newName === null) return;
        
        const newEmail = prompt('Enter new email:', member.email);
        if (newEmail === null) return;
        
        const newPhone = prompt('Enter new phone:', member.phone);
        if (newPhone === null) return;
        
        // Update member
        member.name = newName;
        member.email = newEmail;
        member.phone = newPhone;
        
        addActivityLog(`Updated member details for ${member.name}`);
        saveData();
        
        // Update UI
        renderMembersTable();
        updateMemberSelect();
        updateCheckinBookSelect();
    }
    
    // Delete member
    function deleteMember(memberId) {
        if (!confirm('Are you sure you want to delete this member?')) {
            return;
        }
        
        const memberIndex = members.findIndex(m => m.id === memberId);
        if (memberIndex === -1) return;
        
        const member = members[memberIndex];
        
        // Check if member has borrowed books
        if (member.booksBorrowed.length > 0) {
            alert('Cannot delete member with borrowed books');
            return;
        }
        
        members.splice(memberIndex, 1);
        addActivityLog(`Deleted member ${member.name}`);
        saveData();
        
        // Update UI
        renderMembersTable();
        updateMemberSelect();
        updateCheckinBookSelect();
    }
    
    // Save all data to localStorage
    function saveData() {
        localStorage.setItem('libraryBooks', JSON.stringify(books));
        localStorage.setItem('libraryMembers', JSON.stringify(members));
        localStorage.setItem('libraryTransactions', JSON.stringify(transactions));
        localStorage.setItem('libraryActivityLogs', JSON.stringify(activityLogs));
    }
    
    // Generate unique ID
    function generateId() {
        return 'id-' + Math.random().toString(36).substr(2, 9);
    }
    
    // Initialize the application
    init();
});