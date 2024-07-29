fetch('/employeeCount')
    .then(response => response.json())
    .then(data => {
        document.getElementById('totalUserCount').textContent = data.count;
    })
    .catch(error => {
        console.error('Error fetching user count:', error);
        document.getElementById('totalUserCount').textContent = 'Error';
    });


fetch('/taskCount')
    .then(response => response.json())
    .then(data => {
        document.getElementById('totalTaskCount').textContent = data.count;
    })
    .catch(error => {
        console.error('Error fetching task count:', error);
        document.getElementById('totalTaskCount').textContent = 'Error';
    });

fetch('/completTask')
    .then(response => response.json())
    .then(data => {
        document.getElementById('completeTask').textContent = data.count;
    })
    .catch(error => {
        console.error('Error fetching user count:', error);
        document.getElementById('completeTask').textContent = 'Error';
    });