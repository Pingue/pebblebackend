FROM monokrome/node
RUN apt-get -y update
RUN npm install -g forever
ADD . /app
RUN cd /app; npm install
EXPOSE 6006
CMD [ "forever", "/app/bin/www" ]
