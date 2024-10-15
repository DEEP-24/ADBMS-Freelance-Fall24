// vite.config.ts
import { vitePlugin as remix } from "file:///Users/deep/Documents/Projects/Freelancing/Fall-2024/ADBMS/Online%20Freelance%20Marketplace/source-code/node_modules/@remix-run/dev/dist/index.js";
import morgan from "file:///Users/deep/Documents/Projects/Freelancing/Fall-2024/ADBMS/Online%20Freelance%20Marketplace/source-code/node_modules/morgan/index.js";
import { flatRoutes } from "file:///Users/deep/Documents/Projects/Freelancing/Fall-2024/ADBMS/Online%20Freelance%20Marketplace/source-code/node_modules/remix-flat-routes/dist/index.js";
import { defineConfig } from "file:///Users/deep/Documents/Projects/Freelancing/Fall-2024/ADBMS/Online%20Freelance%20Marketplace/source-code/node_modules/vite/dist/node/index.js";
import tsconfigPaths from "file:///Users/deep/Documents/Projects/Freelancing/Fall-2024/ADBMS/Online%20Freelance%20Marketplace/source-code/node_modules/vite-tsconfig-paths/dist/index.mjs";
var vite_config_default = defineConfig({
  build: { manifest: true },
  plugins: [
    morganPlugin(),
    tsconfigPaths(),
    remix({
      ignoredRouteFiles: ["**/*"],
      serverModuleFormat: "esm",
      routes: async (defineRoutes) => {
        return flatRoutes("routes", defineRoutes, {
          ignoredRouteFiles: ["**/*.test.{js,jsx,ts,tsx}", "**/__*.*"]
        });
      }
    })
  ]
});
function morganPlugin() {
  return {
    name: "morgan-plugin",
    configureServer(server) {
      return () => {
        server.middlewares.use(morgan("tiny"));
      };
    }
  };
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZGVlcC9Eb2N1bWVudHMvUHJvamVjdHMvRnJlZWxhbmNpbmcvRmFsbC0yMDI0L0FEQk1TL09ubGluZSBGcmVlbGFuY2UgTWFya2V0cGxhY2Uvc291cmNlLWNvZGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9kZWVwL0RvY3VtZW50cy9Qcm9qZWN0cy9GcmVlbGFuY2luZy9GYWxsLTIwMjQvQURCTVMvT25saW5lIEZyZWVsYW5jZSBNYXJrZXRwbGFjZS9zb3VyY2UtY29kZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZGVlcC9Eb2N1bWVudHMvUHJvamVjdHMvRnJlZWxhbmNpbmcvRmFsbC0yMDI0L0FEQk1TL09ubGluZSUyMEZyZWVsYW5jZSUyME1hcmtldHBsYWNlL3NvdXJjZS1jb2RlL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgdml0ZVBsdWdpbiBhcyByZW1peCB9IGZyb20gXCJAcmVtaXgtcnVuL2RldlwiO1xuaW1wb3J0IG1vcmdhbiBmcm9tIFwibW9yZ2FuXCI7XG5pbXBvcnQgeyBmbGF0Um91dGVzIH0gZnJvbSBcInJlbWl4LWZsYXQtcm91dGVzXCI7XG5pbXBvcnQgeyB0eXBlIFZpdGVEZXZTZXJ2ZXIsIGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgdHNjb25maWdQYXRocyBmcm9tIFwidml0ZS10c2NvbmZpZy1wYXRoc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBidWlsZDogeyBtYW5pZmVzdDogdHJ1ZSB9LFxuICBwbHVnaW5zOiBbXG4gICAgbW9yZ2FuUGx1Z2luKCksXG4gICAgdHNjb25maWdQYXRocygpLFxuICAgIHJlbWl4KHtcbiAgICAgIGlnbm9yZWRSb3V0ZUZpbGVzOiBbXCIqKi8qXCJdLFxuICAgICAgc2VydmVyTW9kdWxlRm9ybWF0OiBcImVzbVwiLFxuICAgICAgcm91dGVzOiBhc3luYyAoZGVmaW5lUm91dGVzKSA9PiB7XG4gICAgICAgIHJldHVybiBmbGF0Um91dGVzKFwicm91dGVzXCIsIGRlZmluZVJvdXRlcywge1xuICAgICAgICAgIGlnbm9yZWRSb3V0ZUZpbGVzOiBbXCIqKi8qLnRlc3Que2pzLGpzeCx0cyx0c3h9XCIsIFwiKiovX18qLipcIl0sXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICB9KSxcbiAgXSxcbn0pO1xuXG5mdW5jdGlvbiBtb3JnYW5QbHVnaW4oKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogXCJtb3JnYW4tcGx1Z2luXCIsXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcjogVml0ZURldlNlcnZlcikge1xuICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShtb3JnYW4oXCJ0aW55XCIpKTtcbiAgICAgIH07XG4gICAgfSxcbiAgfTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK2QsU0FBUyxjQUFjLGFBQWE7QUFDbmdCLE9BQU8sWUFBWTtBQUNuQixTQUFTLGtCQUFrQjtBQUMzQixTQUE2QixvQkFBb0I7QUFDakQsT0FBTyxtQkFBbUI7QUFFMUIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsT0FBTyxFQUFFLFVBQVUsS0FBSztBQUFBLEVBQ3hCLFNBQVM7QUFBQSxJQUNQLGFBQWE7QUFBQSxJQUNiLGNBQWM7QUFBQSxJQUNkLE1BQU07QUFBQSxNQUNKLG1CQUFtQixDQUFDLE1BQU07QUFBQSxNQUMxQixvQkFBb0I7QUFBQSxNQUNwQixRQUFRLE9BQU8saUJBQWlCO0FBQzlCLGVBQU8sV0FBVyxVQUFVLGNBQWM7QUFBQSxVQUN4QyxtQkFBbUIsQ0FBQyw2QkFBNkIsVUFBVTtBQUFBLFFBQzdELENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUNGLENBQUM7QUFFRCxTQUFTLGVBQWU7QUFDdEIsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sZ0JBQWdCLFFBQXVCO0FBQ3JDLGFBQU8sTUFBTTtBQUNYLGVBQU8sWUFBWSxJQUFJLE9BQU8sTUFBTSxDQUFDO0FBQUEsTUFDdkM7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGOyIsCiAgIm5hbWVzIjogW10KfQo=
