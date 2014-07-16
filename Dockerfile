FROM monokrome/node
RUN apt-get -y update
RUN npm install -g forever
ADD . /app
RUN cd /app; npm install
EXPOSE 6000
WORKDIR /app/
CMD [ "forever", "bin/www"  ]