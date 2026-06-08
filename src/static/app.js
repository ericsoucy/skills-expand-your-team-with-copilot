// Add difficulty state
let currentDifficulty = ""; // empty means show all

// Add difficulty filter buttons handling
const difficultyFilters = document.querySelectorAll('.difficulty-filter');
if (difficultyFilters.length) {
  difficultyFilters.forEach((button) => {
    button.addEventListener('click', () => {
      // Remove active from others
      difficultyFilters.forEach((b) => b.classList.remove('active'));
      button.classList.add('active');

      const selected = button.dataset.difficulty; // 'Beginner' | 'Intermediate' | 'Advanced' | 'unspecified'

      if (selected === 'unspecified') {
        currentDifficulty = 'unspecified';
        // For unspecified we will not include activities with difficulty
        // so we should fetchActivities to let server filter
        fetchActivities();
      } else {
        // For level filters, we want to include activities with that level OR unspecified
        currentDifficulty = selected; // e.g., 'Beginner'
        // We'll fetch activities so server also applies the filter
        fetchActivities();
      }
    });
  });
}

// Update fetchActivities to send difficulty param
async function fetchActivities() {
  // Show loading skeletons first
  showLoadingSkeletons();

  try {
    // Build query string with filters if they exist
    let queryParams = [];

    // Handle day filter
    if (currentDay) {
      queryParams.push(`day=${encodeURIComponent(currentDay)}`);
    }

    // Handle time range filter
    if (currentTimeRange) {
      const range = timeRanges[currentTimeRange];

      // Handle weekend special case
      if (currentTimeRange === "weekend") {
        // Don't add time parameters for weekend filter
        // Weekend filtering will be handled on the client side
      } else if (range) {
        // Add time parameters for before/after school
        queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
        queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
      }
    }

    // Handle difficulty
    if (currentDifficulty) {
      queryParams.push(`difficulty=${encodeURIComponent(currentDifficulty)}`);
    }

    const queryString =
      queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
    const response = await fetch(`/activities${queryString}`);
    const activities = await response.json();

    // Save the activities data
    allActivities = activities;

    // Apply search and filter, and handle weekend filter in client
    displayFilteredActivities();
  } catch (error) {
    activitiesList.innerHTML =
      "<p>Failed to load activities. Please try again later.</p>";
    console.error("Error fetching activities:", error);
  }
}

// Update displayFilteredActivities to consider difficulty in client-side filtering as well
function displayFilteredActivities() {
  // Clear the activities list
  activitiesList.innerHTML = "";

  // Apply client-side filtering - this handles category filter and search, plus weekend filter
  let filteredActivities = {};

  Object.entries(allActivities).forEach(([name, details]) => {
    const activityType = getActivityType(name, details.description);

    // Apply category filter
    if (currentFilter !== "all" && activityType !== currentFilter) {
      return;
    }

    // Handle difficulty in UI (server already applied main difficulty filter, but when weekend or other client filters are used we need local checks)
    if (currentDifficulty) {
      if (currentDifficulty === 'unspecified') {
        // We only want activities that do NOT have a difficulty field
        if (details.difficulty !== undefined) {
          return;
        }
      } else {
        // For a level, include activities where details.difficulty === level OR difficulty is undefined
        if (details.difficulty !== undefined && details.difficulty !== currentDifficulty) {
          return;
        }
      }
    }

    // Apply weekend filter if selected
    if (currentTimeRange === "weekend" && details.schedule_details) {
      const activityDays = details.schedule_details.days;
      const isWeekendActivity = activityDays.some((day) =>
        timeRanges.weekend.days.includes(day)
      );

      if (!isWeekendActivity) {
        return;
      }
    }

    // Apply search filter
    const searchableContent = [
      name.toLowerCase(),
      details.description.toLowerCase(),
      formatSchedule(details).toLowerCase(),
    ].join(" ");

    if (
      searchQuery &&
      !searchableContent.includes(searchQuery.toLowerCase())
    ) {
      return;
    }

    // Activity passed all filters, add to filtered list
    filteredActivities[name] = details;
  });

  // Check if there are any results
  if (Object.keys(filteredActivities).length === 0) {
    activitiesList.innerHTML = `
      <div class="no-results">
        <h4>No activities found</h4>
        <p>Try adjusting your search or filter criteria</p>
      </div>
    `;
    return;
  }

  // Display filtered activities
  Object.entries(filteredActivities).forEach(([name, details]) => {
    renderActivityCard(name, details);
  });
}
