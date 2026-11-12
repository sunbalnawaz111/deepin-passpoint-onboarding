FROM freeradius/freeradius-server:3.2.3-alpine

# Copy custom Passpoint AAA configs
COPY clients.conf /etc/raddb/clients.conf
COPY users /etc/raddb/users
COPY eap.conf /etc/raddb/mods-available/eap

# Ensure permissions and symlinks
RUN chown -R root:radius /etc/raddb/ && \
    chmod 640 /etc/raddb/clients.conf /etc/raddb/users /etc/raddb/mods-available/eap

EXPOSE 1812/udp 1813/udp

# Run FreeRADIUS in debug foreground mode for local testing visibility
CMD ["radiusd", "-X"]

