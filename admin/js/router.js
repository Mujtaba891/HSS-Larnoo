export const Router = {
    routes: {
        'dashboard': 'DashboardView',
        'blogs': 'BlogsView',
        'events': 'EventsView',
        'programs': 'ProgramsView',
        'notices': 'NoticesView',
        'gallery': 'GalleryView',
        'messages': 'MessagesView',
        'newsletter': 'NewsletterView',
    },

    viewCache: new Map(),

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },

    async handleRoute() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const viewName = this.routes[hash] || 'DashboardView';
        const container = document.getElementById('main-content');
        
        if (!container) return;

        // Update active link in all navigation areas
        document.querySelectorAll('.nav-link, .bottom-nav-item, .more-menu-item').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.getElementById(`link-${hash}`);
        if (activeLink) activeLink.classList.add('active');
        
        const activeBottomLink = document.getElementById(`bottom-link-${hash}`);
        if (activeBottomLink) activeBottomLink.classList.add('active');

        const activeMoreLink = document.getElementById(`more-link-${hash}`);
        if (activeMoreLink) {
            activeMoreLink.classList.add('active');
            const moreBtn = document.getElementById('more-btn');
            if (moreBtn) moreBtn.classList.add('active');
        }

        // Hide all cached views
        this.viewCache.forEach(viewEl => {
            viewEl.style.display = 'none';
        });

        // Check if view is already in cache
        if (this.viewCache.has(viewName)) {
            const cachedView = this.viewCache.get(viewName);
            cachedView.style.display = 'block';
            
            // Optionally: Call a 'refresh' method if the view needs updated data
            // if (cachedView._viewObject && cachedView._viewObject.onPageShow) {
            //    cachedView._viewObject.onPageShow(cachedView);
            // }
            return;
        }

        // Load and render new view
        try {
            // Show loading state
            const loader = document.createElement('div');
            loader.id = 'temp-loader';
            loader.innerHTML = `<div class="text-center" style="margin-top: 50px;"><i class="fas fa-circle-notch fa-spin fa-2x"></i></div>`;
            container.appendChild(loader);

            const { [viewName]: View } = await import(`./views/${viewName}.js`);
            
            // Create a wrapper for this view
            const viewWrapper = document.createElement('div');
            viewWrapper.id = `view-${viewName}`;
            viewWrapper.className = 'view-wrapper';
            container.appendChild(viewWrapper);
            
            // Remove loader
            loader.remove();

            // Render view into wrapper
            await View.render(viewWrapper);
            
            // Cache the wrapper
            viewWrapper._viewObject = View;
            this.viewCache.set(viewName, viewWrapper);

        } catch (error) {
            console.error(`Failed to load view: ${viewName}`, error);
            const errorEl = document.createElement('div');
            errorEl.className = 'gov-alert gov-alert-danger';
            errorEl.textContent = 'Error loading page. Please try again.';
            container.appendChild(errorEl);
            setTimeout(() => errorEl.remove(), 3000);
        }
    }
};
