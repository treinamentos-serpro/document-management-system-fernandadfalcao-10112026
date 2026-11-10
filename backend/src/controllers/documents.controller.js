function createDocumentsController(service) {
  return {
    async upload(req, res, next) {
      try {
        const document = await service.upload({ file: req.file, owner: req.body.owner });
        res.status(201).json(document);
      } catch (error) {
        next(error);
      }
    },

    async list(req, res, next) {
      try {
        const documents = await service.list(req.query.owner);
        res.status(200).json(documents);
      } catch (error) {
        next(error);
      }
    },

    async download(req, res, next) {
      try {
        const download = await service.getDownload(req.params.id, req.query.owner);
        res.download(
          download.filePath,
          download.originalName,
          { headers: { 'Content-Type': 'application/octet-stream' } },
          (error) => {
            if (error) {
              next(error);
            }
          },
        );
      } catch (error) {
        next(error);
      }
    },
  };
}

module.exports = { createDocumentsController };