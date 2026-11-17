# Static web server for Divide & Conquer / Teile & Herrsche
#
#   docker build -t divide-and-conquer .
#   docker run -d --name divide-and-conquer -p 8083:8083 --restart unless-stopped divide-and-conquer
#
# Then open http://<server>:8083
#
# Uses the official *unprivileged* nginx image: the server runs as a non-root user.
FROM nginxinc/nginx-unprivileged:1.30-alpine

# remove the default nginx welcome page (needs root for this one step)
USER root
RUN rm -rf /usr/share/nginx/html/*

# web server config (listens on 8083)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# the app itself: plain static files, no build step
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

# back to the unprivileged nginx user (uid 101) for running the server
USER 101

EXPOSE 8083

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8083/ || exit 1
