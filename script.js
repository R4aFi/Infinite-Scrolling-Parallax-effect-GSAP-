const scroll = new LocomotiveScroll({
    el: document.querySelector('.container'),
    smooth: true
});

const projectData = [
    { title: "Car", image: "assets/01.jpg", isAlternate: false },
    { title: "Candles", image: "assets/02.jpg", isAlternate: true },
    { title: "Girl", image: "assets/03.jpg", isAlternate: false },
    { title: "Metro", image: "assets/04.jpg", isAlternate: true },
    { title: "Door", image: "assets/05.jpg", isAlternate: false },
    { title: "Fox", image: "assets/06.jpg", isAlternate: true },
    { title: "Air Ballon", image: "assets/07.jpg", isAlternate: false },
    { title: "Sunset", image: "assets/08.jpg", isAlternate: true },
];


const lerp = (start,end,factor) => start +(end -start)* factor

const config ={
    Scroll_speed: 0.75,
    Lerp_factor: 0.05,
    Buffer_size: 15,
    Cleanup_threshold:50,
    max_velocity : 120,
    snap_duration: 1200,
}

const state = {
    curretY: 0,
    targetY: 0,
    lastY: 0,
    scrollVelocity: 0,
    isDragging: false,
    startY: 0,
    projects: new Map(),
    parallaxImages: new Map(),
    projectHeight: window.innerHeight,
    isSnapping: false,
    snapStartTime: 0,
    snapStartY: 0,
    snapTargetY: 0,
    lastScrollingTime: Date.now(),
    isScrolling: false,
};

const createParallaxImage = (imageElement) => {
    let bounds = null;
    let currentTranslateY = 0;
    let targetTranslateY = 0;

    const updateBounds = () => {
        if (imageElement) {
            const rect = imageElement.getBoundingClientRect();
            bounds = {
                top: rect.top + window.scrollY,
                bottom: rect.bottom + window.scrollY,
            };
        }
    };

    const update = (scroll) => {
        if (!bounds) return;
        
        // Calculate the relative scroll position
        const relativeScroll = -scroll - bounds.top;
        targetTranslateY = relativeScroll * 0.2;
        
        // Smooth lerp for the translation
        currentTranslateY = lerp(currentTranslateY, targetTranslateY, 0.1);
        
        // Apply both scale and translation
        if (Math.abs(currentTranslateY - targetTranslateY) > 0.01) {
            imageElement.style.transform = `translateY(${currentTranslateY}px)`; // Fixed the transform syntax and added scale
        }
    };

    updateBounds();
    return { update, updateBounds };
};

const getProjectData = (index) => {
    const dataIndex = ((Math.abs(index) % projectData.length) + projectData.length) % projectData.length;
    return projectData[dataIndex]
};

const createProjectElement = (index) =>{
    if (state.projects.has(index)) return;

    const template = document.querySelector(".template");
    const project = template.cloneNode(true)
    project.style.display ="flex";
    project.classList.remove("template")

    const dataIndex = ((Math.abs(index) % projectData.length) + projectData.length) % projectData.length;
    const data = getProjectData(index);
    const projectNumber = (dataIndex + 1).toString().padStart(2,"0");

    project.innerHTML = data.isAlternate
        ? ` <div class ="side">
              <div class="img"> <img src="${data.image}" alt ="${data.title}" /> </div>
              </div> 
           <div class = "side">
              <div class ="title"> 
                <h1> ${data.title} </h1>
                <h1> ${projectNumber}</h1>
              </div>
            </div>`
        : `<div class ="side">
              <div class="title">
                <h1> ${data.title} </h1>
                <h1> ${projectNumber}</h1>
              </div>
            </div>
            <div class ="side">
              <div class="img"> <img src="${data.image}" alt ="${data.title}" /> </div>
              </div> `
    project.style.transform = `translateY(${index * state.projectHeight}px)`;
    document.querySelector(".project-list").appendChild(project);
    state.projects.set(index,project);

    const img = project.querySelector("img");
    if (img) {
        state.parallaxImages.set(index, createParallaxImage(img));
    }
};

const createInitialProjects = () => {
    for (let i = -config.Buffer_size; i <=config.Buffer_size; i++) {
        createProjectElement(i)
    }
}

const getCurrentIndex = () => Math.round(-state.targetY / state.projectHeight);

const cheackAndCreateProjects = () => {
    const currentIndex = getCurrentIndex();
    const minNeeded = currentIndex - config.Buffer_size;
    const maxNeeded = currentIndex + config.Buffer_size;

    for (let i = minNeeded; i<= maxNeeded ; i++) {
        if (!state.projects.has(i)) {
            createProjectElement(i);
        }
    }

    state.projects.forEach((project,index) => {
        if (
            index < currentIndex - config.Cleanup_threshold || 
            index > currentIndex + config.Cleanup_threshold
        ) {
            project.remove();
            state.project.delete(index);
            state.parallaxImages.delete(index);
        }
    });
};

const getClosestSnapPoint = () => {
    const currentPosition = -state.targetY;
    const currentIndex = Math.round(currentPosition / state.projectHeight);
    return -currentIndex * state.projectHeight;
};

const initiateSnap = () => {
    if (state.isSnapping) return; // Prevent multiple snap initiations
    state.isSnapping = true;
    state.snapStartTime = Date.now();
    state.snapStartY = state.targetY;
    state.snapTargetY = getClosestSnapPoint();
};

const updateSnap = () => {
    const elapsed = Date.now() - state.snapStartTime;
    const progress = Math.min(elapsed / config.snap_duration, 1);
    
    // Improved easing function for smoother deceleration
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    
    state.targetY = state.snapStartY + (state.snapTargetY - state.snapStartY) * easeOutQuart;
    
    if (progress >= 1) {
        state.isSnapping = false;
        state.targetY = state.snapTargetY;
    }
};

const animate = () => {
    const now = Date.now();
    const timeSinceScroll = now - state.lastScrollingTime;

    if (!state.isSnapping && !state.isDragging && timeSinceScroll > 150) {
        const snapPoint = getClosestSnapPoint();
        if (Math.abs(state.targetY - snapPoint) > 1) {
            initiateSnap();
        }
    }

    if (state.isSnapping) {
        updateSnap();
    }

    if (!state.isDragging) {
        const scrollDelta = state.targetY - state.curretY;
        state.curretY += scrollDelta * config.Lerp_factor;
    }

    cheackAndCreateProjects();

    state.projects.forEach((project, index) => {
        const y = index * state.projectHeight + state.curretY;
        project.style.transform = `translateY(${y}px)`;

        const parallaxImage = state.parallaxImages.get(index);
        if (parallaxImage) {
            parallaxImage.update(state.curretY);
        }
    });

    requestAnimationFrame(animate);
};

const handlewheel = (e) => {
    e.preventDefault();
    state.isSnapping = false;
    state.lastScrollingTime = Date.now();

    const scrollDelta = e.deltaY * config.Scroll_speed;
    state.targetY -= Math.max(
        Math.min(scrollDelta, config.max_velocity),
        -config.max_velocity
    );
};

const handleTouchstart = (e) => {
    state.isDragging = true;
    state.isSnapping = false;
    state.startY = e.touches[0].clientY;
    state.lastY = state.targetY;
    state.lastScrollingTime = Date.now();
};


const handleTouchMove = (e) => {
    if (!state.isDragging) return;
    
    const deltaY = (e.touches[0].clientY - state.startY) * 1.5;
    state.targetY = state.lastY + deltaY;
    state.lastScrollingTime = Date.now();
};



const touchEnd = () => {
    state.isDragging = false;
    initiateSnap(); // Initiate snap immediately after touch end
};

const handleResize = () => {
    state.projectHeight = window.innerHeight;
    state.projects.forEach((project, index) => {
        project.style.transform = `translateY(${index*state.projectHeight})`;

        const parallaxImage = state.parallaxImages.get(index);
        if (parallaxImage) {
            parallaxImage.updateBounds()
        }
    });
};

const initializeScroll = () => {
    window.addEventListener("wheel", handlewheel, {passive: false});
    window.addEventListener("touchstart", handleTouchstart)
    window.addEventListener("touchmove", handleTouchMove)
    window.addEventListener("touchend", touchEnd)
    window.addEventListener("resize", handleResize)

    createInitialProjects();
    animate();

};

document.addEventListener("DOMContentLoaded", initializeScroll);
